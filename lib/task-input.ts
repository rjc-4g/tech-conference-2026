import type { Priority } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseDateOnlyInAppTimezone } from "@/lib/date";

export type ParsedTaskInput = {
  title: string;
  description: string | null;
  priority: Priority;
  dueDate: Date | null | undefined;
  isToday: boolean;
  parentId: string | null;
  categoryId: string | null;
  nextAction: string;
  estimateMinutes: number | null;
};

type ParseSuccess = { ok: true; value: ParsedTaskInput };
type ParseFailure = { ok: false; message: string };
export type ParseTaskInputResult = ParseSuccess | ParseFailure;

export function isPriority(value: unknown): value is Priority {
  return value === "low" || value === "medium" || value === "high";
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type ParsedNullableId =
  | { value: string | null; message?: undefined }
  | { value?: undefined; message: string };

function parseNullableId(value: unknown, fieldName: string): ParsedNullableId {
  if (value === undefined || value === null || value === "") return { value: null };
  if (typeof value !== "string" || value.trim() === "") {
    return { message: `${fieldName}の値が不正です。` };
  }

  return { value: value.trim() };
}

export async function parseTaskInput(
  body: unknown,
  options: { currentTaskId?: string } = {}
): Promise<ParseTaskInputResult> {
  if (!isRecord(body)) {
    return { ok: false, message: "リクエストボディの形式が不正です。" };
  }

  if (typeof body.title !== "string" || body.title.trim() === "") {
    return { ok: false, message: "タイトルは必須です。" };
  }

  if (typeof body.nextAction !== "string" || body.nextAction.trim() === "") {
    return { ok: false, message: "次にやる具体的な行動は必須です。" };
  }

  if (body.priority !== undefined && !isPriority(body.priority)) {
    return { ok: false, message: "優先度の値が不正です。" };
  }

  const dueDate = parseDateOnlyInAppTimezone(body.dueDate);
  if (body.dueDate !== undefined && dueDate === undefined) {
    return { ok: false, message: "期限日はYYYY-MM-DD形式で指定してください。" };
  }

  let estimateMinutes: number | null = null;
  if (body.estimateMinutes !== undefined && body.estimateMinutes !== null) {
    if (
      typeof body.estimateMinutes !== "number" ||
      !Number.isInteger(body.estimateMinutes) ||
      body.estimateMinutes < 0
    ) {
      return { ok: false, message: "見積時間は0以上の整数で指定してください。" };
    }
    estimateMinutes = body.estimateMinutes;
  }

  const parsedParentId = parseNullableId(body.parentId, "親タスクID");
  if (parsedParentId.message) return { ok: false, message: parsedParentId.message };
  const parentId = parsedParentId.value;

  const parsedCategoryId = parseNullableId(body.categoryId, "カテゴリID");
  if (parsedCategoryId.message) return { ok: false, message: parsedCategoryId.message };
  const categoryId = parsedCategoryId.value;

  if (parentId) {
    if (options.currentTaskId && parentId === options.currentTaskId) {
      return { ok: false, message: "自分自身を親タスクには指定できません。" };
    }

    const parent = await prisma.task.findFirst({
      where: {
        id: parentId,
        deletedAt: null
      },
      select: {
        id: true,
        parentId: true
      }
    });

    if (!parent) {
      return { ok: false, message: "指定された親タスクが存在しません。" };
    }

    if (parent.parentId !== null) {
      return { ok: false, message: "子タスクを親タスクには指定できません。" };
    }

    if (options.currentTaskId) {
      const childrenCount = await prisma.task.count({
        where: {
          parentId: options.currentTaskId,
          deletedAt: null
        }
      });

      if (childrenCount > 0) {
        return {
          ok: false,
          message: "子タスクを持つタスクは、別タスクの子タスクには変更できません。"
        };
      }
    }
  }

  if (categoryId) {
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        deletedAt: null
      },
      select: { id: true }
    });

    if (!category) {
      return { ok: false, message: "指定されたカテゴリが存在しません。" };
    }
  }

  return {
    ok: true,
    value: {
      title: body.title.trim(),
      description:
        typeof body.description === "string" && body.description.trim() !== ""
          ? body.description.trim()
          : null,
      priority: isPriority(body.priority) ? body.priority : "medium",
      dueDate,
      isToday: Boolean(body.isToday),
      parentId,
      categoryId,
      nextAction: body.nextAction.trim(),
      estimateMinutes
    }
  };
}
