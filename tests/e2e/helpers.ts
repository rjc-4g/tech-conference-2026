import { expect, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type TaskDto = {
  id: string;
  title: string;
  description: string | null;
  status: "todo" | "done";
  parentId: string | null;
  categoryId: string | null;
  nextAction: string;
  estimateMinutes: number | null;
  progress: number;
  hasUnstartedRisk: boolean;
  contextOnly: boolean;
  startedAt: string | null;
  lastWorkedAt: string | null;
  completedAt: string | null;
};

export type CategoryDto = {
  id: string;
  name: string;
  color: string | null;
};

export function uniqueName(prefix: string) {
  return `${prefix} ${Date.now()} ${Math.random().toString(36).slice(2, 8)}`;
}

export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function taskCard(page: Page, title: string): Locator {
  return page.getByTestId("task-card").filter({ hasText: title });
}

export async function taskTitles(page: Page, prefix?: string): Promise<string[]> {
  const titles = await page.getByTestId("task-title").allTextContents();
  return prefix ? titles.filter((title) => title.startsWith(prefix)) : titles;
}

export async function createCategory(
  request: APIRequestContext,
  data: { name: string; color?: string | null }
): Promise<CategoryDto> {
  const response = await request.post("/api/categories", {
    data: {
      name: data.name,
      color: data.color ?? null
    }
  });
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as { category: CategoryDto };
  return body.category;
}

export async function createTask(
  request: APIRequestContext,
  data: {
    title: string;
    nextAction?: string;
    description?: string | null;
    priority?: "low" | "medium" | "high";
    dueDate?: string | null;
    isToday?: boolean;
    parentId?: string | null;
    categoryId?: string | null;
    estimateMinutes?: number | null;
  }
): Promise<TaskDto> {
  const response = await request.post("/api/tasks", {
    data: {
      title: data.title,
      nextAction: data.nextAction ?? `${data.title} の次の行動`,
      description: data.description ?? null,
      priority: data.priority ?? "medium",
      dueDate: data.dueDate ?? null,
      isToday: data.isToday ?? false,
      parentId: data.parentId ?? null,
      categoryId: data.categoryId ?? null,
      estimateMinutes: data.estimateMinutes ?? null
    }
  });
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as { task: TaskDto };
  return body.task;
}

export async function getTask(request: APIRequestContext, id: string): Promise<TaskDto> {
  const response = await request.get(`/api/tasks/${id}`);
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as { task: TaskDto };
  return body.task;
}

export async function completeTask(
  request: APIRequestContext,
  id: string,
  completed = true
): Promise<TaskDto> {
  const response = await request.patch(`/api/tasks/${id}/complete`, {
    data: { completed }
  });
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as { task: TaskDto };
  return body.task;
}

export async function searchTasks(page: Page, query: string) {
  await page.getByLabel("タスク検索").fill(query);
  await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/tasks") && new URL(res.url()).searchParams.get("q") === query),
    page.getByRole("button", { name: "検索", exact: true }).click()
  ]);
}

export async function showTodayTasks(page: Page) {
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/tasks") && new URL(res.url()).searchParams.get("filter") === "today"),
    page.getByRole("button", { name: "今日", exact: true }).click()
  ]);
  return response;
}

export async function selectCategoryFilter(page: Page, categoryId: string) {
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/tasks") && new URL(res.url()).searchParams.get("categoryId") === categoryId),
    page.getByLabel("カテゴリで絞り込み").selectOption(categoryId)
  ]);
  return response;
}

function loadDotEnv() {
  const envPath = join(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...valueParts] = trimmed.split("=");
    if (!key || process.env[key]) continue;
    const rawValue = valueParts.join("=").trim();
    process.env[key] = rawValue.replace(/^['\"]|['\"]$/g, "");
  }
}

export async function getPrisma() {
  loadDotEnv();
  process.env.DATABASE_URL ??= "file:./dev.db";
  const module = await import("../../lib/prisma");
  return module.prisma;
}

export async function dragTaskOver(page: Page, sourceTitle: string, targetTitle: string) {
  const sourceHandle = taskCard(page, sourceTitle).getByRole("button", {
    name: new RegExp(`${escapeRegExp(sourceTitle)}.*ドラッグして並べ替える`)
  });
  const targetHandle = taskCard(page, targetTitle).getByRole("button", {
    name: new RegExp(`${escapeRegExp(targetTitle)}.*ドラッグして並べ替える`)
  });

  await sourceHandle.scrollIntoViewIfNeeded();
  await targetHandle.scrollIntoViewIfNeeded();
  await expect(sourceHandle).toBeVisible();
  await expect(targetHandle).toBeVisible();

  const sourceBox = await sourceHandle.boundingBox();
  const targetBox = await targetHandle.boundingBox();
  if (!sourceBox || !targetBox) {
    throw new Error("ドラッグハンドルの位置を取得できませんでした。");
  }

  const sourceX = sourceBox.x + sourceBox.width / 2;
  const sourceY = sourceBox.y + sourceBox.height / 2;
  const targetX = targetBox.x + targetBox.width / 2;
  const targetY = targetBox.y + targetBox.height / 2;

  await page.mouse.move(sourceX, sourceY);
  await page.mouse.down();
  await page.mouse.move(sourceX + 12, sourceY + 12, { steps: 4 });
  await page.waitForTimeout(50);
  await page.mouse.move(targetX, targetY, { steps: 16 });
  await page.mouse.up();
}
