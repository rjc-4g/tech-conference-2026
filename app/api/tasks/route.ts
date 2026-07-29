import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseTaskInput } from "@/lib/task-input";
import { getTaskList, parseTaskCategoryId, parseTaskFilter, parseTaskSearchQuery, taskInclude } from "@/lib/task-query";
import { buildTaskViews, serializeTaskView } from "@/lib/task-view";

type ErrorCode =
  | "TASK_LIST_FAILED"
  | "TASK_CREATE_FAILED"
  | "VALIDATION_ERROR";

function errorResponse(error: ErrorCode, message: string, status = 500) {
  return NextResponse.json({ error, message }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const filter = parseTaskFilter(request.nextUrl.searchParams.get("filter"));
    const q = parseTaskSearchQuery(request.nextUrl.searchParams.get("q"));
    const categoryId = parseTaskCategoryId(request.nextUrl.searchParams.get("categoryId"));
    const result = await getTaskList(filter, q, categoryId);

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return errorResponse("TASK_LIST_FAILED", "TODO一覧の取得に失敗しました。", 500);
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse("VALIDATION_ERROR", "リクエストボディのJSONが不正です。", 400);
  }

  try {
    const parsed = await parseTaskInput(body);
    if (!parsed.ok) {
      return errorResponse("VALIDATION_ERROR", parsed.message, 400);
    }

    const input = parsed.value;
    const maxSortTask = await prisma.task.findFirst({
      where: {
        parentId: input.parentId,
        deletedAt: null
      },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true }
    });

    const task = await prisma.task.create({
      data: {
        ...input,
        sortOrder: (maxSortTask?.sortOrder ?? 0) + 10
      },
      include: taskInclude
    });

    const [taskView] = buildTaskViews([task]);
    return NextResponse.json({ task: serializeTaskView(taskView) }, { status: 201 });
  } catch (error) {
    console.error(error);
    return errorResponse("TASK_CREATE_FAILED", "TODOの作成に失敗しました。", 500);
  }
}
