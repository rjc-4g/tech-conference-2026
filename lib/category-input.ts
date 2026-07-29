import { isRecord } from "@/lib/task-input";

export type ParsedCategoryInput = {
  name: string;
  color: string | null;
};

type ParseSuccess = { ok: true; value: ParsedCategoryInput };
type ParseFailure = { ok: false; message: string };
export type ParseCategoryInputResult = ParseSuccess | ParseFailure;

const hexColorPattern = /^#[0-9a-fA-F]{6}$/;

export function parseCategoryInput(body: unknown): ParseCategoryInputResult {
  if (!isRecord(body)) {
    return { ok: false, message: "リクエストボディの形式が不正です。" };
  }

  if (typeof body.name !== "string" || body.name.trim() === "") {
    return { ok: false, message: "カテゴリ名は必須です。" };
  }

  const name = body.name.trim();
  if (name.length > 50) {
    return { ok: false, message: "カテゴリ名は50文字以内で指定してください。" };
  }

  let color: string | null = null;
  if (body.color !== undefined && body.color !== null && body.color !== "") {
    if (typeof body.color !== "string" || !hexColorPattern.test(body.color.trim())) {
      return { ok: false, message: "カテゴリ色は#RRGGBB形式で指定してください。" };
    }
    color = body.color.trim();
  }

  return {
    ok: true,
    value: {
      name,
      color
    }
  };
}
