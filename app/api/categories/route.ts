import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseCategoryInput } from "@/lib/category-input";
import { categorySelect } from "@/lib/category-view";

type ErrorCode =
  | "CATEGORY_LIST_FAILED"
  | "CATEGORY_CREATE_FAILED"
  | "VALIDATION_ERROR";

function errorResponse(error: ErrorCode, message: string, status = 500) {
  return NextResponse.json({ error, message }, { status });
}


export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: categorySelect
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error(error);
    return errorResponse("CATEGORY_LIST_FAILED", "カテゴリ一覧の取得に失敗しました。", 500);
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
    const parsed = parseCategoryInput(body);
    if (!parsed.ok) {
      return errorResponse("VALIDATION_ERROR", parsed.message, 400);
    }

    const maxSortCategory = await prisma.category.findFirst({
      where: { deletedAt: null },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true }
    });

    const category = await prisma.category.create({
      data: {
        ...parsed.value,
        sortOrder: (maxSortCategory?.sortOrder ?? 0) + 10
      },
      select: categorySelect
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error(error);
    return errorResponse("CATEGORY_CREATE_FAILED", "カテゴリの作成に失敗しました。", 500);
  }
}
