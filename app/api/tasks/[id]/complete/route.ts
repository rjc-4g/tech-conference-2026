import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRecord } from "@/lib/task-input";
import { taskInclude } from "@/lib/task-query";
import { buildTaskViews, serializeTaskView } from "@/lib/task-view";


type ErrorCode = "TASK_NOT_FOUND" | "TASK_COMPLETE_FAILED" | "VALIDATION_ERROR";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function errorResponse(error: ErrorCode, message: string, status = 500) {
  return NextResponse.json({ error, message }, { status });
}

function parseCompleteBody(body: unknown):
  | { ok: true; completed: boolean | null }
  | { ok: false; message: string } {
  if (body === undefined || body === null) {
    return { ok: true, completed: null };
  }

  if (!isRecord(body)) {
    return { ok: false, message: "リクエストボディの形式が不正です。" };
  }

  if (!("completed" in body)) {
    return { ok: true, completed: null };
  }

  if (typeof body.completed !== "boolean") {
    return { ok: false, message: "completedはbooleanで指定してください。" };
  }

  return { ok: true, completed: body.completed };
}

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

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  let body: unknown = null;

  try {
    const text = await request.text();
    body = text ? JSON.parse(text) : null;
  } catch {
    return errorResponse("VALIDATION_ERROR", "リクエストボディのJSONが不正です。", 400);
  }

  try {
    const parsed = parseCompleteBody(body);
    if (!parsed.ok) {
      return errorResponse("VALIDATION_ERROR", parsed.message, 400);
    }

    const task = await prisma.task.findFirst({
      where: {
        id,
        deletedAt: null
      },
      select: {
        id: true,
        status: true,
        parentId: true,
        startedAt: true
      }
    });

    if (!task) {
      return errorResponse("TASK_NOT_FOUND", "指定されたTODOが存在しません。", 404);
    }

    const shouldComplete = parsed.completed ?? task.status !== "done";
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      if (shouldComplete) {
        await tx.task.update({
          where: { id },
          data: {
            status: "done",
            startedAt: task.startedAt ?? now,
            lastWorkedAt: now,
            completedAt: now
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
                startedAt: parent.startedAt ?? now,
                lastWorkedAt: now
              }
            });
          }
        }
      } else {
        await tx.task.update({
          where: { id },
          data: {
            status: "todo",
            completedAt: null
          }
        });
      }
    });

    const taskView = await getTaskViewById(id);
    if (!taskView) {
      return errorResponse("TASK_NOT_FOUND", "指定されたTODOが存在しません。", 404);
    }

    return NextResponse.json({
      task: serializeTaskView(taskView),
      completed: shouldComplete
    });
  } catch (error) {
    console.error(error);
    return errorResponse("TASK_COMPLETE_FAILED", "TODOの完了状態更新に失敗しました。", 500);
  }
}
