import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildTaskViews, serializeTaskView } from "@/lib/task-view";
import { taskInclude } from "@/lib/task-query";

type ErrorCode = "TASK_NOT_FOUND" | "TASK_WORK_FAILED";

function errorResponse(error: ErrorCode, message: string, status = 500) {
  return NextResponse.json({ error, message }, { status });
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function getTaskViewById(id: string) {
  const relatedTasks = await prisma.task.findMany({
    where: {
      deletedAt: null,
      OR: [{ id }, { parentId: id }]
    },
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    include: taskInclude
  });

  const targetTask = relatedTasks.find((task) => task.id === id);
  if (!targetTask) return null;

  const [taskView] = buildTaskViews([targetTask], new Date(), relatedTasks);
  return taskView;
}

export async function PATCH(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const task = await prisma.task.findFirst({
      where: {
        id,
        deletedAt: null
      },
      select: {
        id: true,
        parentId: true,
        startedAt: true
      }
    });

    if (!task) {
      return errorResponse("TASK_NOT_FOUND", "指定されたTODOが存在しません。", 404);
    }

    const workedAt = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id },
        data: {
          startedAt: task.startedAt ?? workedAt,
          lastWorkedAt: workedAt
        }
      });

      if (task.parentId) {
        const parent = await tx.task.findFirst({
          where: {
            id: task.parentId,
            deletedAt: null
          },
          select: {
            id: true,
            startedAt: true
          }
        });

        if (parent) {
          await tx.task.update({
            where: { id: parent.id },
            data: {
              startedAt: parent.startedAt ?? workedAt,
              lastWorkedAt: workedAt
            }
          });
        }
      }
    });

    const taskView = await getTaskViewById(id);
    if (!taskView) {
      return errorResponse("TASK_NOT_FOUND", "指定されたTODOが存在しません。", 404);
    }

    return NextResponse.json({
      task: serializeTaskView(taskView),
      workedAt: workedAt.toISOString()
    });
  } catch (error) {
    console.error(error);
    return errorResponse("TASK_WORK_FAILED", "TODOの着手日時更新に失敗しました。", 500);
  }
}
