export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export type Task = {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  categoryId?: string;
  parentTaskId?: string;
  firstAction?: string;
  progress: number;
  isToday: boolean;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type Category = {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
};

export type UserSettings = {
  todayTaskLimit: number;
  staleTaskDays: number;
};

export type TaskInput = {
  title?: unknown;
  description?: unknown;
  status?: unknown;
  priority?: unknown;
  dueDate?: unknown;
  categoryId?: unknown;
  parentTaskId?: unknown;
  firstAction?: unknown;
  progress?: unknown;
  isToday?: unknown;
};
