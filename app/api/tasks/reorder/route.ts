import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRecord } from "@/lib/task-input";
import { mergeVisibleTaskOrder } from "@/lib/reorder";

type ErrorCode = "TASK_REORDER_FAILED" | "VALIDATION_ERROR";

function errorResponse(error: ErrorCode, message: string, status = 500) {
  return NextResponse.json({ error, message }, { status });
}

function parseReorderBody(body: unknown):
  | { ok: true; parentId: string | null; orderedTaskIds: string[] }
  | { ok: false; message: string } {
  if (!isRecord(body)) {
    return { ok: false, message: "リクエストボディの形式が不正です。" };
  }

  if (!("parentId" in body)) {
    return { ok: false, message: "parentIdは必須です。トップレベルの場合はnullを指定してください。" };
  }

  if (body.parentId !== null && typeof body.parentId !== "string") {
    return { ok: false, message: "parentIdは文字列またはnullで指定してください。" };
  }

  const parentId = body.parentId === null ? null : body.parentId.trim();
  if (parentId === "") {
    return { ok: false, message: "parentIdに空文字は指定できません。トップレベルの場合はnullを指定してください。" };
  }

  if (!Array.isArray(body.orderedTaskIds) || body.orderedTaskIds.length === 0) {
    return { ok: false, message: "orderedTaskIdsは1件以上の配列で指定してください。" };
  }

  const orderedTaskIds = body.orderedTaskIds.map((id) => (typeof id === "string" ? id.trim() : ""));
  if (orderedTaskIds.some((id) => id === "")) {
    return { ok: false, message: "orderedTaskIdsには空でない文字列IDを指定してください。" };
  }

  if (new Set(orderedTaskIds).size !== orderedTaskIds.length) {
    return { ok: false, message: "orderedTaskIdsに重複したIDを含めることはできません。" };
  }

  return { ok: true, parentId, orderedTaskIds };
}

export async function PATCH(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse("VALIDATION_ERROR", "リクエストボディのJSONが不正です。", 400);
  }

  try {
    const parsed = parseReorderBody(body);
    if (!parsed.ok) {
      return errorResponse("VALIDATION_ERROR", parsed.message, 400);
    }

    const { parentId, orderedTaskIds } = parsed;

    if (parentId !== null) {
      const parentTask = await prisma.task.findFirst({
        where: {
          id: parentId,
          deletedAt: null
        },
        select: {
          id: true,
          parentId: true
        }
      });

      if (!parentTask) {
        return errorResponse("VALIDATION_ERROR", "指定された親タスクが存在しません。", 400);
      }

      if (parentTask.parentId !== null) {
        return errorResponse("VALIDATION_ERROR", "子タスク配下での並べ替えはできません。", 400);
      }
    }

    const siblings = await prisma.task.findMany({
      where: {
        parentId,
        deletedAt: null
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        sortOrder: true
      }
    });

    const siblingIds = new Set(siblings.map((task) => task.id));
    const invalidIds = orderedTaskIds.filter((id) => !siblingIds.has(id));
    if (invalidIds.length > 0) {
      return errorResponse(
        "VALIDATION_ERROR",
        "orderedTaskIdsには同一親配下の未削除タスクのみ指定してください。",
        400
      );
    }

    const nextSortOrders = mergeVisibleTaskOrder(siblings, orderedTaskIds);

    await prisma.$transaction(
      nextSortOrders.map((task) =>
        prisma.task.update({
          where: { id: task.id },
          data: { sortOrder: task.sortOrder }
        })
      )
    );

    return NextResponse.json({
      parentId,
      reorderedTaskIds: orderedTaskIds,
      tasks: nextSortOrders
    });
  } catch (error) {
    console.error(error);
    return errorResponse("TASK_REORDER_FAILED", "TODOの並び替えに失敗しました。", 500);
  }
}
