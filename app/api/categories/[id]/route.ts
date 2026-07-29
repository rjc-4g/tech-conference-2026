import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseCategoryInput } from "@/lib/category-input";
import { categorySelect } from "@/lib/category-view";

type ErrorCode =
  | "CATEGORY_NOT_FOUND"
  | "CATEGORY_UPDATE_FAILED"
  | "CATEGORY_DELETE_FAILED"
  | "VALIDATION_ERROR";

function errorResponse(error: ErrorCode, message: string, status = 500) {
  return NextResponse.json({ error, message }, { status });
}

type RouteContext = {
  params: Promise<{ id: string }>;
};


export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse("VALIDATION_ERROR", "リクエストボディのJSONが不正です。", 400);
  }

  try {
    const currentCategory = await prisma.category.findFirst({
      where: {
        id,
        deletedAt: null
      },
      select: { id: true }
    });

    if (!currentCategory) {
      return errorResponse("CATEGORY_NOT_FOUND", "指定されたカテゴリが存在しません。", 404);
    }

    const parsed = parseCategoryInput(body);
    if (!parsed.ok) {
      return errorResponse("VALIDATION_ERROR", parsed.message, 400);
    }

    const category = await prisma.category.update({
      where: { id },
      data: parsed.value,
      select: categorySelect
    });

    return NextResponse.json({ category });
  } catch (error) {
    console.error(error);
    return errorResponse("CATEGORY_UPDATE_FAILED", "カテゴリの更新に失敗しました。", 500);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const currentCategory = await prisma.category.findFirst({
      where: {
        id,
        deletedAt: null
      },
      select: { id: true }
    });

    if (!currentCategory) {
      return errorResponse("CATEGORY_NOT_FOUND", "指定されたカテゴリが存在しません。", 404);
    }

    const deletedAt = new Date();

    const result = await prisma.$transaction(async (tx) => {
      await tx.category.update({
        where: { id },
        data: { deletedAt }
      });

      const unassignedTasks = await tx.task.updateMany({
        where: {
          categoryId: id,
          deletedAt: null
        },
        data: {
          categoryId: null,
          updatedAt: deletedAt
        }
      });

      return unassignedTasks;
    });

    return NextResponse.json({
      deletedCategoryId: id,
      unassignedTaskCount: result.count,
      deletedAt: deletedAt.toISOString()
    });
  } catch (error) {
    console.error(error);
    return errorResponse("CATEGORY_DELETE_FAILED", "カテゴリの削除に失敗しました。", 500);
  }
}
