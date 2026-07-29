import type { Category, Task } from "@prisma/client";
import { APP_TIMEZONE, getTodayYmdInAppTimezone, toYmdInAppTimezone } from "@/lib/date";

export type TaskFilter = "all" | "today";

export type TaskWithCategory = Task & {
  category: Pick<Category, "id" | "name" | "color"> | null;
};

export type TaskView = TaskWithCategory & {
  progress: number;
  childrenCount: number;
  isOverdue: boolean;
  isTodayTarget: boolean;
  hasUnstartedRisk: boolean;
  matchedByFilter: boolean;
  contextOnly: boolean;
};

export type TaskViewDto = Omit<
  TaskView,
  "dueDate" | "startedAt" | "lastWorkedAt" | "completedAt" | "createdAt" | "updatedAt" | "deletedAt"
> & {
  dueDate: string | null;
  startedAt: string | null;
  lastWorkedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type TaskListMeta = {
  filter: TaskFilter;
  q: string;
  categoryId: string | null;
  timezone: typeof APP_TIMEZONE;
  today: string;
  totalCount: number;
  directMatchedCount: number;
  contextOnlyCount: number;
  totalEstimateMinutes: number;
};

function isCompleted(task: Task) {
  return task.status === "done";
}

export function getTaskDateState(
  task: Pick<Task, "dueDate" | "isToday" | "status">,
  today: string
) {
  const dueDateYmd = task.dueDate ? toYmdInAppTimezone(task.dueDate) : null;
  const isOverdue = Boolean(dueDateYmd && dueDateYmd < today && task.status === "todo");
  const isTodayTarget = Boolean(task.isToday || dueDateYmd === today || isOverdue);

  return {
    dueDateYmd,
    isOverdue,
    isTodayTarget
  };
}

export function calculateTaskProgress(task: Task, children: Task[]) {
  if (children.length > 0) {
    const completedChildrenCount = children.filter(isCompleted).length;
    return Math.round((completedChildrenCount / children.length) * 100);
  }

  return isCompleted(task) ? 100 : 0;
}

export function buildChildrenByParentId<T extends { parentId: string | null }>(tasks: T[]) {
  const childrenByParentId = new Map<string, T[]>();

  for (const task of tasks) {
    if (!task.parentId) continue;
    const children = childrenByParentId.get(task.parentId) ?? [];
    children.push(task);
    childrenByParentId.set(task.parentId, children);
  }

  return childrenByParentId;
}

export function buildTaskViews(
  displayTasks: TaskWithCategory[],
  now = new Date(),
  progressSourceTasks: TaskWithCategory[] = displayTasks,
  options: {
    matchedTaskIds?: Set<string>;
    contextOnlyTaskIds?: Set<string>;
    today?: string;
  } = {}
): TaskView[] {
  const childrenByParentId = buildChildrenByParentId(progressSourceTasks);
  const today = options.today ?? getTodayYmdInAppTimezone(now);
  const { matchedTaskIds, contextOnlyTaskIds } = options;

  return displayTasks.map((task) => {
    const children = childrenByParentId.get(task.id) ?? [];
    const childrenCount = children.length;
    const progress = calculateTaskProgress(task, children);

    const { isOverdue, isTodayTarget } = getTaskDateState(task, today);
    const ageMs = now.getTime() - task.createdAt.getTime();
    const hasUnstartedRisk =
      task.status === "todo" &&
      ageMs >= 24 * 60 * 60 * 1000 &&
      progress === 0 &&
      task.lastWorkedAt === null;

    const contextOnly = contextOnlyTaskIds?.has(task.id) ?? false;
    const matchedByFilter = matchedTaskIds ? matchedTaskIds.has(task.id) : !contextOnly;

    return {
      ...task,
      progress,
      childrenCount,
      isOverdue,
      isTodayTarget,
      hasUnstartedRisk,
      matchedByFilter,
      contextOnly
    };
  });
}

export function serializeTaskView(task: TaskView): TaskViewDto {
  return {
    ...task,
    dueDate: task.dueDate?.toISOString() ?? null,
    startedAt: task.startedAt?.toISOString() ?? null,
    lastWorkedAt: task.lastWorkedAt?.toISOString() ?? null,
    completedAt: task.completedAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    deletedAt: task.deletedAt?.toISOString() ?? null
  };
}

export function serializeTaskViews(tasks: TaskView[]): TaskViewDto[] {
  return tasks.map(serializeTaskView);
}

export function buildTaskHierarchy<T extends { id: string; parentId: string | null }>(tasks: T[]) {
  const childrenByParentId = buildChildrenByParentId(tasks);

  return tasks
    .filter((task) => task.parentId === null)
    .map((task) => ({
      task,
      children: childrenByParentId.get(task.id) ?? []
    }));
}
