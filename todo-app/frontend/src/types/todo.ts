export type Priority = "high" | "medium" | "low";

export type Category = {
  id: number;
  name: string;
  color?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Todo = {
  id: number;
  title: string;
  description?: string | null;
  category?: Category | null;
  categoryId?: number | null;
  parentId?: number | null;
  priority: Priority;
  dueDate?: string | null;
  isToday: boolean;
  isCompleted: boolean;
  progress: number;
  firstAction?: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type TodoRequest = {
  title: string;
  description?: string;
  categoryId?: number | null;
  parentId?: number | null;
  priority: Priority;
  dueDate?: string | null;
  isToday: boolean;
  isCompleted: boolean;
  progress: number;
  firstAction?: string;
  sortOrder?: number;
};
