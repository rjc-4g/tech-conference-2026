import { expect, test } from "@playwright/test";
import {
  completeTask,
  createCategory,
  createTask,
  dragTaskOver,
  escapeRegExp,
  searchTasks,
  selectCategoryFilter,
  showTodayTasks,
  taskCard,
  taskTitles,
  uniqueName
} from "./helpers";

function ymdInTokyo(offsetDays: number) {
  const date = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

test("期限切れ未完了タスクが今日表示に含まれる", async ({ page }) => {
  const category = await createCategory(page.request, { name: uniqueName("E2E 期限切れカテゴリ") });
  const overdueTitle = uniqueName("E2E 期限切れ");
  const futureTitle = uniqueName("E2E 期限未来");
  await createTask(page.request, {
    title: overdueTitle,
    categoryId: category.id,
    dueDate: ymdInTokyo(-1),
    isToday: false
  });
  await createTask(page.request, {
    title: futureTitle,
    categoryId: category.id,
    dueDate: ymdInTokyo(3),
    isToday: false
  });

  await page.goto("/");
  await selectCategoryFilter(page, category.id);
  await showTodayTasks(page);

  const overdueCard = taskCard(page, overdueTitle);
  await expect(overdueCard).toBeVisible();
  await expect(overdueCard.getByText("期限切れ", { exact: true })).toBeVisible();
  await expect(taskCard(page, futureTitle)).toHaveCount(0);
});

test("今日表示中の合計見積時間が正しく表示される", async ({ page }) => {
  const category = await createCategory(page.request, { name: uniqueName("E2E 見積カテゴリ") });
  const taskA = await createTask(page.request, {
    title: uniqueName("E2E 見積A"),
    categoryId: category.id,
    isToday: true,
    estimateMinutes: 30
  });
  const taskB = await createTask(page.request, {
    title: uniqueName("E2E 見積B"),
    categoryId: category.id,
    isToday: true,
    estimateMinutes: 15
  });
  const taskC = await createTask(page.request, {
    title: uniqueName("E2E 見積完了"),
    categoryId: category.id,
    isToday: true,
    estimateMinutes: 20
  });
  await completeTask(page.request, taskC.id, true);
  const parent = await createTask(page.request, {
    title: uniqueName("E2E 見積関連親"),
    isToday: false,
    dueDate: null,
    estimateMinutes: 60
  });
  const child = await createTask(page.request, {
    title: uniqueName("E2E 見積子"),
    parentId: parent.id,
    categoryId: category.id,
    isToday: true,
    estimateMinutes: 10
  });

  await page.goto("/");
  await selectCategoryFilter(page, category.id);
  const response = await showTodayTasks(page);
  const body = await response.json();

  expect(body.meta.categoryId).toBe(category.id);
  expect(body.meta.totalEstimateMinutes).toBe(55);
  await expect(page.getByText("55分").first()).toBeVisible();
  await expect(taskCard(page, taskA.title)).toBeVisible();
  await expect(taskCard(page, taskB.title)).toBeVisible();
  await expect(taskCard(page, child.title)).toBeVisible();
});

test("親タスク・子タスクを2階層で表示できる", async ({ page }) => {
  const prefix = uniqueName("E2E 階層");
  const parentTitle = `${prefix} 親`;
  const childOneTitle = `${prefix} 子1`;
  const childTwoTitle = `${prefix} 子2`;
  const parent = await createTask(page.request, { title: parentTitle });
  await createTask(page.request, { title: childOneTitle, parentId: parent.id });
  await createTask(page.request, { title: childTwoTitle, parentId: parent.id });

  await page.goto("/");
  await searchTasks(page, prefix);

  await expect(taskCard(page, parentTitle)).toBeVisible();
  await expect(taskCard(page, childOneTitle).getByText("子タスク", { exact: true })).toBeVisible();
  await expect(taskCard(page, childTwoTitle).getByText("子タスク", { exact: true })).toBeVisible();
  expect(await taskTitles(page, prefix)).toEqual([parentTitle, childOneTitle, childTwoTitle]);
});

test("親タスクの進捗バーが子タスク全体から計算される", async ({ page }) => {
  const prefix = uniqueName("E2E 親進捗");
  const parentTitle = `${prefix} 親`;
  const parent = await createTask(page.request, { title: parentTitle });
  const childOne = await createTask(page.request, { title: `${prefix} 子1`, parentId: parent.id });
  await createTask(page.request, { title: `${prefix} 子2`, parentId: parent.id });
  await createTask(page.request, { title: `${prefix} 子3`, parentId: parent.id });
  await completeTask(page.request, childOne.id, true);

  await page.goto("/");
  await searchTasks(page, prefix);

  await expect(taskCard(page, parentTitle).getByRole("progressbar", { name: "進捗 33%" })).toHaveAttribute(
    "aria-valuenow",
    "33"
  );
});

test("カテゴリを更新できる", async ({ page }) => {
  const category = await createCategory(page.request, { name: uniqueName("E2E 更新前カテゴリ"), color: "#60a5fa" });
  const updatedCategoryName = uniqueName("E2E 更新後カテゴリ");
  const title = uniqueName("E2E カテゴリ更新タスク");
  await createTask(page.request, { title, categoryId: category.id });

  await page.goto("/");
  await expect(taskCard(page, title).getByText(category.name)).toBeVisible();

  await page.getByRole("button", { name: `${category.name}を編集`, exact: true }).click();
  await page.locator("#category-name").fill(updatedCategoryName);
  await Promise.all([
    page.waitForResponse((res) => res.url().includes(`/api/categories/${category.id}`) && res.request().method() === "PATCH"),
    page.getByRole("button", { name: "更新", exact: true }).click()
  ]);

  await expect(page.getByRole("button", { name: `${updatedCategoryName}を削除`, exact: true })).toBeVisible();
  await expect(page.getByLabel("カテゴリで絞り込み")).toContainText(updatedCategoryName);
  await expect(taskCard(page, title).getByText(updatedCategoryName)).toBeVisible();
});

test("説明で検索できる", async ({ page }) => {
  const keyword = uniqueName("E2E説明検索");
  const targetTitle = uniqueName("E2E 説明検索対象");
  const otherTitle = uniqueName("E2E 説明検索対象外");
  await createTask(page.request, { title: targetTitle, description: `${keyword} を説明欄に含める` });
  await createTask(page.request, { title: otherTitle, description: "検索に一致しない説明" });

  await page.goto("/");
  await searchTasks(page, keyword);

  await expect(taskCard(page, targetTitle)).toBeVisible();
  await expect(taskCard(page, otherTitle)).toHaveCount(0);
});

test("カテゴリ名で検索できる", async ({ page }) => {
  const category = await createCategory(page.request, { name: uniqueName("E2Eカテゴリ名検索") });
  const targetTitle = uniqueName("E2E カテゴリ名検索対象");
  const otherTitle = uniqueName("E2E カテゴリ名検索対象外");
  await createTask(page.request, { title: targetTitle, categoryId: category.id });
  await createTask(page.request, { title: otherTitle });

  await page.goto("/");
  await searchTasks(page, category.name);

  await expect(taskCard(page, targetTitle)).toBeVisible();
  await expect(taskCard(page, otherTitle)).toHaveCount(0);
});

test("子タスクを同一親配下でドラッグ並べ替えできる", async ({ page }) => {
  const prefix = uniqueName("E2E 子並べ替え");
  const parentTitle = `${prefix} 親`;
  const firstTitle = `${prefix} 子1`;
  const secondTitle = `${prefix} 子2`;
  const thirdTitle = `${prefix} 子3`;
  const parent = await createTask(page.request, { title: parentTitle });
  const first = await createTask(page.request, { title: firstTitle, parentId: parent.id });
  const second = await createTask(page.request, { title: secondTitle, parentId: parent.id });
  const third = await createTask(page.request, { title: thirdTitle, parentId: parent.id });

  await page.goto("/");
  await searchTasks(page, prefix);

  const responsePromise = page.waitForResponse((res) =>
    res.url().includes("/api/tasks/reorder") && res.request().method() === "PATCH"
  );
  await dragTaskOver(page, thirdTitle, firstTitle);
  const response = await responsePromise;
  const body = await response.json();

  expect(body.parentId).toBe(parent.id);
  expect(body.reorderedTaskIds).toEqual([third.id, first.id, second.id]);
  await expect.poll(async () => taskTitles(page, prefix)).toEqual([parentTitle, thirdTitle, firstTitle, secondTitle]);
});

test("フィルタ中の並べ替えで非表示タスクの位置が維持される", async ({ page }) => {
  const prefix = uniqueName("E2E フィルタ並べ替え");
  const parent = await createTask(page.request, {
    title: `${prefix} 親`,
    isToday: false,
    dueDate: null
  });
  const taskOne = await createTask(page.request, { title: `${prefix} task_1`, parentId: parent.id, isToday: true });
  const taskTwo = await createTask(page.request, { title: `${prefix} task_2`, parentId: parent.id, isToday: false, dueDate: null });
  const taskThree = await createTask(page.request, { title: `${prefix} task_3`, parentId: parent.id, isToday: true });
  const taskFour = await createTask(page.request, { title: `${prefix} task_4`, parentId: parent.id, isToday: false, dueDate: null });
  const taskFive = await createTask(page.request, { title: `${prefix} task_5`, parentId: parent.id, isToday: true });

  await page.goto("/");
  await showTodayTasks(page);
  await searchTasks(page, prefix);

  await expect(taskCard(page, taskOne.title)).toBeVisible();
  await expect(taskCard(page, taskTwo.title)).toHaveCount(0);
  await expect(taskCard(page, taskThree.title)).toBeVisible();
  await expect(taskCard(page, taskFour.title)).toHaveCount(0);
  await expect(taskCard(page, taskFive.title)).toBeVisible();

  const responsePromise = page.waitForResponse((res) =>
    res.url().includes("/api/tasks/reorder") && res.request().method() === "PATCH"
  );
  await dragTaskOver(page, taskThree.title, taskOne.title);
  const response = await responsePromise;
  const body = await response.json();

  expect(body.parentId).toBe(parent.id);
  expect(body.reorderedTaskIds).toEqual([taskThree.id, taskOne.id, taskFive.id]);
  expect(body.tasks.map((task: { id: string }) => task.id)).toEqual([
    taskThree.id,
    taskTwo.id,
    taskOne.id,
    taskFour.id,
    taskFive.id
  ]);
});

test("contextOnlyタスクはドラッグ対象外である", async ({ page }) => {
  const parentTitle = uniqueName("E2E contextOnly親");
  const childTitle = uniqueName("E2E contextOnly子");
  const parent = await createTask(page.request, { title: parentTitle, isToday: false, dueDate: null });
  await createTask(page.request, { title: childTitle, parentId: parent.id, isToday: true });
  const reorderRequests: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "PATCH" && request.url().includes("/api/tasks/reorder")) {
      reorderRequests.push(request.postData() ?? "");
    }
  });

  await page.goto("/");
  await showTodayTasks(page);

  const parentCard = taskCard(page, parentTitle).filter({ hasText: "関連する親タスク" });
  await expect(parentCard).toBeVisible();
  await expect(parentCard).toHaveAttribute("data-context-only", "true");
  await expect(
    parentCard.getByRole("button", {
      name: new RegExp(`${escapeRegExp(parentTitle)}.*ドラッグして並べ替える`)
    })
  ).toHaveCount(0);
  expect(reorderRequests.some((body) => body.includes(parent.id))).toBe(false);
});
