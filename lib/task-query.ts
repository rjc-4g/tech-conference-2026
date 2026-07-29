import { prisma } from "@/lib/prisma";
import { APP_TIMEZONE, getTodayYmdInAppTimezone } from "@/lib/date";
import {
  buildTaskViews,
  getTaskDateState,
  serializeTaskViews,
  type TaskFilter,
  type TaskListMeta,
  type TaskView,
  type TaskViewDto,
  type TaskWithCategory
} from "@/lib/task-view";

export const taskInclude = {
  category: {
    select: {
      id: true,
      name: true,
      color: true
    }
  }
} as const;

export function parseTaskFilter(value: string | null): TaskFilter {
  return value === "today" ? "today" : "all";
}

export function parseTaskSearchQuery(value: string | null) {
  return (value ?? "").trim();
}

export function parseTaskCategoryId(value: string | null) {
  const normalized = (value ?? "").trim();
  return normalized || null;
}

export function matchesSearchQuery(task: TaskWithCategory, q: string) {
  if (!q) return true;

  const normalizedQuery = q.toLocaleLowerCase("ja-JP");
  const targets = [
    task.title,
    task.description ?? "",
    task.nextAction,
    task.category?.name ?? ""
  ];

  return targets.some((target) => target.toLocaleLowerCase("ja-JP").includes(normalizedQuery));
}

export function matchesTaskFilter(task: TaskWithCategory, filter: TaskFilter, today: string) {
  if (filter === "all") return true;
  return getTaskDateState(task, today).isTodayTarget;
}

export function matchesCategoryFilter(task: TaskWithCategory, categoryId: string | null) {
  if (!categoryId) return true;
  return task.categoryId === categoryId;
}

export function buildDisplayTasksForFilter(
  tasks: TaskWithCategory[],
  filter: TaskFilter,
  q: string,
  today: string,
  categoryId: string | null = null
) {
  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  const matchedTaskIds = new Set<string>();
  const contextOnlyTaskIds = new Set<string>();

  for (const task of tasks) {
    if (
      matchesTaskFilter(task, filter, today) &&
      matchesSearchQuery(task, q) &&
      matchesCategoryFilter(task, categoryId)
    ) {
      matchedTaskIds.add(task.id);
    }
  }

  for (const task of tasks) {
    if (!matchedTaskIds.has(task.id) || !task.parentId) continue;
    if (!matchedTaskIds.has(task.parentId) && tasksById.has(task.parentId)) {
      contextOnlyTaskIds.add(task.parentId);
    }
  }

  const displayTaskIds = new Set([...matchedTaskIds, ...contextOnlyTaskIds]);
  const displayTasks = tasks.filter((task) => displayTaskIds.has(task.id));

  return {
    displayTasks,
    matchedTaskIds,
    contextOnlyTaskIds
  };
}

export function buildTaskListMeta(
  filter: TaskFilter,
  q: string,
  today: string,
  views: TaskView[],
  categoryId: string | null = null
): TaskListMeta {
  return {
    filter,
    q,
    categoryId,
    timezone: APP_TIMEZONE,
    today,
    totalCount: views.length,
    directMatchedCount: views.filter((task) => task.matchedByFilter).length,
    contextOnlyCount: views.filter((task) => task.contextOnly).length,
    totalEstimateMinutes: views
      .filter((task) => task.matchedByFilter && !task.contextOnly && task.status === "todo")
      .reduce((total, task) => total + (task.estimateMinutes ?? 0), 0)
  };
}

export async function getTaskList(
  filter: TaskFilter = "all",
  q = "",
  categoryId: string | null = null
): Promise<{
  tasks: TaskViewDto[];
  meta: TaskListMeta;
}> {
  const now = new Date();
  const today = getTodayYmdInAppTimezone(now);
  const normalizedQuery = q.trim();
  const normalizedCategoryId = parseTaskCategoryId(categoryId);
  const allTasks = await prisma.task.findMany({
    where: { deletedAt: null },
    // SQLite は ASC で NULL first になるため、parentId=null の親タスクが先に並ぶ。
    // 将来DBを変更する場合は、親タスク優先の明示的な並び替えへ見直す。
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    include: taskInclude
  });

  const { displayTasks, matchedTaskIds, contextOnlyTaskIds } = buildDisplayTasksForFilter(
    allTasks,
    filter,
    normalizedQuery,
    today,
    normalizedCategoryId
  );
  const views = buildTaskViews(displayTasks, now, allTasks, {
    matchedTaskIds,
    contextOnlyTaskIds,
    today
  });

  return {
    tasks: serializeTaskViews(views),
    meta: buildTaskListMeta(filter, normalizedQuery, today, views, normalizedCategoryId)
  };
}
