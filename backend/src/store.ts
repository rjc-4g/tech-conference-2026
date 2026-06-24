import { randomUUID } from "node:crypto";
import type { Category, Task, TaskInput, TaskPriority, TaskStatus, UserSettings } from "./types";

type TaskListQuery = {
  q?: string;
  categoryId?: string;
  status?: string;
  sort?: string;
};

const priorityRank: Record<TaskPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const statuses: TaskStatus[] = ["todo", "in_progress", "done"];
const priorities: TaskPriority[] = ["low", "medium", "high"];

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class TodoStore {
  private tasks = new Map<string, Task>();
  private categories = new Map<string, Category>();
  private settings: UserSettings = {
    todayTaskLimit: 3,
    staleTaskDays: 3,
  };

  constructor() {
    this.seed();
  }

  reset() {
    this.tasks.clear();
    this.categories.clear();
    this.settings = {
      todayTaskLimit: 3,
      staleTaskDays: 3,
    };
    this.seed();
  }

  listTasks(query: TaskListQuery = {}) {
    let tasks = [...this.tasks.values()];

    if (query.q) {
      const keyword = query.q.toLowerCase();
      tasks = tasks.filter(
        (task) =>
          task.title.toLowerCase().includes(keyword) ||
          (task.description ?? "").toLowerCase().includes(keyword),
      );
    }

    if (query.categoryId) {
      tasks = tasks.filter((task) => task.categoryId === query.categoryId);
    }

    if (query.status && statuses.includes(query.status as TaskStatus)) {
      tasks = tasks.filter((task) => task.status === query.status);
    }

    return this.sortTasks(tasks, query.sort);
  }

  getTask(id: string) {
    const task = this.tasks.get(id);
    if (!task) {
      throw new NotFoundError("Task not found");
    }
    return task;
  }

  createTask(input: TaskInput) {
    const now = new Date().toISOString();
    const task: Task = {
      id: randomUUID(),
      ...this.normalizeTaskInput(input),
      createdAt: now,
      updatedAt: now,
    };

    this.validateParent(task.id, task.parentTaskId);
    this.tasks.set(task.id, task);
    return task;
  }

  updateTask(id: string, input: TaskInput) {
    const current = this.getTask(id);
    const next: Task = {
      ...current,
      ...this.normalizeTaskInput(input, current),
      updatedAt: new Date().toISOString(),
    };

    this.validateParent(id, next.parentTaskId);
    this.tasks.set(id, next);
    return next;
  }

  deleteTask(id: string) {
    this.getTask(id);
    for (const task of this.tasks.values()) {
      if (task.parentTaskId === id) {
        this.tasks.set(task.id, {
          ...task,
          parentTaskId: undefined,
          updatedAt: new Date().toISOString(),
        });
      }
    }
    this.tasks.delete(id);
  }

  completeTask(id: string) {
    const task = this.getTask(id);
    const now = new Date().toISOString();
    const next: Task = {
      ...task,
      status: "done",
      completedAt: now,
      updatedAt: now,
    };
    this.tasks.set(id, next);
    return next;
  }

  startTask(id: string) {
    const task = this.getTask(id);
    const now = new Date().toISOString();
    const next: Task = {
      ...task,
      status: "in_progress",
      startedAt: task.startedAt ?? now,
      updatedAt: now,
    };
    this.tasks.set(id, next);
    return next;
  }

  listCategories() {
    return [...this.categories.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  createCategory(input: Partial<Category>) {
    if (!input.name || input.name.length > 40) {
      throw new ValidationError("Category name is required and must be 40 characters or less");
    }

    const now = new Date().toISOString();
    const category: Category = {
      id: randomUUID(),
      name: input.name,
      color: input.color || "#2563eb",
      createdAt: now,
      updatedAt: now,
    };
    this.categories.set(category.id, category);
    return category;
  }

  updateCategory(id: string, input: Partial<Category>) {
    const current = this.categories.get(id);
    if (!current) {
      throw new NotFoundError("Category not found");
    }
    if (!input.name || input.name.length > 40) {
      throw new ValidationError("Category name is required and must be 40 characters or less");
    }

    const next: Category = {
      ...current,
      name: input.name,
      color: input.color || current.color,
      updatedAt: new Date().toISOString(),
    };
    this.categories.set(id, next);
    return next;
  }

  deleteCategory(id: string) {
    if (!this.categories.has(id)) {
      throw new NotFoundError("Category not found");
    }
    this.categories.delete(id);
    for (const task of this.tasks.values()) {
      if (task.categoryId === id) {
        this.tasks.set(task.id, {
          ...task,
          categoryId: undefined,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  getSettings() {
    return this.settings;
  }

  updateSettings(input: Partial<UserSettings>) {
    const todayTaskLimit = Number(input.todayTaskLimit ?? this.settings.todayTaskLimit);
    const staleTaskDays = Number(input.staleTaskDays ?? this.settings.staleTaskDays);

    if (!Number.isInteger(todayTaskLimit) || todayTaskLimit < 1 || todayTaskLimit > 20) {
      throw new ValidationError("todayTaskLimit must be an integer between 1 and 20");
    }
    if (!Number.isInteger(staleTaskDays) || staleTaskDays < 1 || staleTaskDays > 30) {
      throw new ValidationError("staleTaskDays must be an integer between 1 and 30");
    }

    this.settings = { todayTaskLimit, staleTaskDays };
    return this.settings;
  }

  getProgress(taskId: string) {
    const children = [...this.tasks.values()].filter((task) => task.parentTaskId === taskId);
    if (children.length === 0) {
      return this.getTask(taskId).status === "done" ? 100 : 0;
    }

    const doneCount = children.filter((task) => task.status === "done").length;
    return Math.round((doneCount / children.length) * 100);
  }

  private normalizeTaskInput(input: TaskInput, current?: Task) {
    const title = typeof input.title === "string" ? input.title.trim() : current?.title;
    const description =
      typeof input.description === "string" ? input.description.trim() : current?.description;
    const status = typeof input.status === "string" ? input.status : current?.status ?? "todo";
    const priority =
      typeof input.priority === "string" ? input.priority : current?.priority ?? "medium";
    const dueDate = typeof input.dueDate === "string" && input.dueDate ? input.dueDate : undefined;
    const categoryId =
      typeof input.categoryId === "string" && input.categoryId ? input.categoryId : undefined;
    const parentTaskId =
      typeof input.parentTaskId === "string" && input.parentTaskId ? input.parentTaskId : undefined;
    const firstAction =
      typeof input.firstAction === "string" && input.firstAction.trim()
        ? input.firstAction.trim()
        : undefined;
    const isToday = typeof input.isToday === "boolean" ? input.isToday : current?.isToday ?? false;

    if (!title || title.length > 100) {
      throw new ValidationError("Title is required and must be 100 characters or less");
    }
    if (description && description.length > 1000) {
      throw new ValidationError("Description must be 1000 characters or less");
    }
    if (!statuses.includes(status as TaskStatus)) {
      throw new ValidationError("Invalid status");
    }
    if (!priorities.includes(priority as TaskPriority)) {
      throw new ValidationError("Invalid priority");
    }
    if (categoryId && !this.categories.has(categoryId)) {
      throw new ValidationError("Category does not exist");
    }
    if (parentTaskId && !this.tasks.has(parentTaskId)) {
      throw new ValidationError("Parent task does not exist");
    }

    return {
      title,
      description,
      status: status as TaskStatus,
      priority: priority as TaskPriority,
      dueDate,
      categoryId,
      parentTaskId,
      firstAction,
      isToday,
    };
  }

  private validateParent(taskId: string, parentTaskId?: string) {
    if (!parentTaskId) {
      return;
    }
    if (taskId === parentTaskId) {
      throw new ValidationError("Task cannot be its own parent");
    }

    let currentParentId: string | undefined = parentTaskId;
    while (currentParentId) {
      if (currentParentId === taskId) {
        throw new ValidationError("Task cannot use a descendant as parent");
      }
      currentParentId = this.tasks.get(currentParentId)?.parentTaskId;
    }
  }

  private sortTasks(tasks: Task[], sort = "createdAt") {
    const sorted = [...tasks];
    switch (sort) {
      case "dueDate":
        return sorted.sort((a, b) => (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31"));
      case "priority":
        return sorted.sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority]);
      case "incomplete":
        return sorted.sort((a, b) => Number(a.status === "done") - Number(b.status === "done"));
      case "createdAt":
      default:
        return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
  }

  private seed() {
    const personal = this.createCategory({ name: "個人", color: "#0ea5e9" });
    const work = this.createCategory({ name: "仕事", color: "#22c55e" });

    this.createTask({
      title: "買い物リストを作る",
      description: "夕食に必要な材料を確認する",
      priority: "medium",
      dueDate: new Date().toISOString().slice(0, 10),
      categoryId: personal.id,
      isToday: true,
    });
    this.createTask({
      title: "週次レポートを下書きする",
      priority: "high",
      categoryId: work.id,
      isToday: true,
    });
  }
}
