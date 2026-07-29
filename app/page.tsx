import { prisma } from "@/lib/prisma";
import { APP_TIMEZONE } from "@/lib/date";
import { categorySelect, type CategoryViewDto } from "@/lib/category-view";
import { getTaskList } from "@/lib/task-query";
import { type TaskListMeta, type TaskViewDto } from "@/lib/task-view";
import { TaskListClient } from "./task-list-client";

export const dynamic = "force-dynamic";

async function getInitialData(): Promise<{
  tasks: TaskViewDto[];
  categories: CategoryViewDto[];
  meta: TaskListMeta;
  errorMessage: string | null;
}> {
  try {
    const [taskList, categories] = await Promise.all([
      getTaskList("all"),
      prisma.category.findMany({
        where: { deletedAt: null },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: categorySelect
      })
    ]);

    return {
      tasks: taskList.tasks,
      categories,
      meta: taskList.meta,
      errorMessage: null
    };
  } catch (error) {
    console.error(error);
    return {
      tasks: [],
      categories: [],
      meta: {
        filter: "all",
        q: "",
        categoryId: null,
        timezone: APP_TIMEZONE,
        today: "",
        totalCount: 0,
        directMatchedCount: 0,
        contextOnlyCount: 0,
        totalEstimateMinutes: 0
      },
      errorMessage:
        "TODO一覧を取得できませんでした。DBマイグレーションが未実行の場合は README の手順でセットアップしてください。"
    };
  }
}

export default async function Home() {
  const { tasks, categories, meta, errorMessage } = await getInitialData();

  return (
    <TaskListClient
      initialTasks={tasks}
      initialCategories={categories}
      initialMeta={meta}
      initialErrorMessage={errorMessage}
    />
  );
}
