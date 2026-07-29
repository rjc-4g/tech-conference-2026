import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseTaskInput } from "@/lib/task-input";
import { buildTaskViews, serializeTaskView } from "@/lib/task-view";

type ErrorCode =
  | "TASK_DETAIL_FAILED"
  | "TASK_UPDATE_FAILED"
  | "TASK_DELETE_FAILED"
  | "TASK_NOT_FOUND"
  | "CHILD_TASK_EXISTS"
  | "VALIDATION_ERROR";

function errorResponse(error: ErrorCode, message: string, status = 500) {
  return NextResponse.json({ error, message }, { status });
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

const taskInclude = {
  category: {
    select: {
      id: true,
      name: true,
      color: true
    }
  }
} as const;

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

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const taskView = await getTaskViewById(id);
    if (!taskView) {
      return errorResponse("TASK_NOT_FOUND", "指定されたTODOが存在しません。", 404);
    }

    return NextResponse.json({ task: serializeTaskView(taskView) });
  } catch (error) {
    console.error(error);
    return errorResponse("TASK_DETAIL_FAILED", "TODO詳細の取得に失敗しました。", 500);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse("VALIDATION_ERROR", "リクエストボディのJSONが不正です。", 400);
  }

  try {
    const currentTask = await prisma.task.findFirst({
      where: {
        id,
        deletedAt: null
      },
      select: { id: true }
    });

    if (!currentTask) {
      return errorResponse("TASK_NOT_FOUND", "指定されたTODOが存在しません。", 404);
    }

    const parsed = await parseTaskInput(body, { currentTaskId: id });
    if (!parsed.ok) {
      return errorResponse("VALIDATION_ERROR", parsed.message, 400);
    }

    await prisma.task.update({
      where: { id },
      data: parsed.value
    });

    const taskView = await getTaskViewById(id);
    if (!taskView) {
      return errorResponse("TASK_NOT_FOUND", "指定されたTODOが存在しません。", 404);
    }

    return NextResponse.json({ task: serializeTaskView(taskView) });
  } catch (error) {
    console.error(error);
    return errorResponse("TASK_UPDATE_FAILED", "TODOの更新に失敗しました。", 500);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const cascade = request.nextUrl.searchParams.get("cascade") === "true";

  try {
    const task = await prisma.task.findFirst({
      where: {
        id,
        deletedAt: null
      },
      select: {
        id: true,
        parentId: true
      }
    });

    if (!task) {
      return errorResponse("TASK_NOT_FOUND", "指定されたTODOが存在しません。", 404);
    }

    const children = await prisma.task.findMany({
      where: {
        parentId: id,
        deletedAt: null
      },
      select: { id: true }
    });

    if (children.length > 0 && !cascade) {
      return errorResponse(
        "CHILD_TASK_EXISTS",
        "子タスクが存在するため、削除には確認が必要です。",
        409
      );
    }

    const deletedAt = new Date();
    const deletedTaskIds = [id, ...(cascade ? children.map((child) => child.id) : [])];

    await prisma.task.updateMany({
      where: {
        id: { in: deletedTaskIds },
        deletedAt: null
      },
      data: { deletedAt }
    });

    return NextResponse.json({
      deletedTaskIds,
      deletedAt: deletedAt.toISOString()
    });
  } catch (error) {
    console.error(error);
    return errorResponse("TASK_DELETE_FAILED", "TODOの削除に失敗しました。", 500);
  }
}
