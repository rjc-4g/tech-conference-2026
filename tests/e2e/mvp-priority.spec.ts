import { expect, test } from "@playwright/test";
import {
  completeTask,
  createCategory,
  createTask,
  dragTaskOver,
  getPrisma,
  getTask,
  searchTasks,
  selectCategoryFilter,
  showTodayTasks,
  taskCard,
  taskTitles,
  uniqueName
} from "./helpers";

test("必須項目未入力時にTODO登録リクエストが送信されない", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "TODO追加", exact: true }).click();

  let requestSent = false;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/api/tasks")) {
      requestSent = true;
    }
  });

  await page.getByRole("button", { name: "登録する", exact: true }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("input:invalid, textarea:invalid")).toHaveCount(2);
  expect(requestSent).toBe(false);
});



test("見積時間に不正値を入力すると登録できない", async ({ page }) => {
  const title = uniqueName("E2E 見積不正");

  await page.goto("/");
  await page.getByRole("button", { name: "TODO追加", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/タイトル/).fill(title);
  await dialog.getByLabel(/次にやる具体的な行動/).fill("見積時間のブラウザバリデーションを確認する");
  await dialog.getByLabel(/見積時間/).fill("3.5");

  let requestSent = false;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/api/tasks")) {
      requestSent = true;
    }
  });

  await page.getByRole("button", { name: "登録する", exact: true }).click();

  await expect(dialog).toBeVisible();
  const estimateInput = dialog.getByLabel(/見積時間/);
  await expect(estimateInput).toBeVisible();
  expect(await estimateInput.evaluate((element) => element.matches(":invalid"))).toBe(true);
  expect(requestSent).toBe(false);
});

test("TODOを編集できる", async ({ page }) => {
  const originalTitle = uniqueName("E2E 編集前");
  const updatedTitle = uniqueName("E2E 編集後");
  const updatedAction = uniqueName("E2E 編集後アクション");
  await createTask(page.request, {
    title: originalTitle,
    description: "編集前の説明",
    nextAction: "編集前の次の行動",
    estimateMinutes: 10
  });

  await page.goto("/");
  await taskCard(page, originalTitle).getByRole("button", { name: "編集", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/タイトル/).fill(updatedTitle);
  await dialog.getByLabel(/説明/).fill("編集後の説明");
  await dialog.getByLabel(/次にやる具体的な行動/).fill(updatedAction);
  await dialog.getByLabel(/見積時間/).fill("25");
  await dialog.getByRole("button", { name: "更新する", exact: true }).click();

  const updatedCard = taskCard(page, updatedTitle);
  await expect(updatedCard).toBeVisible();
  await expect(updatedCard.getByText("編集後の説明")).toBeVisible();
  await expect(updatedCard.getByText(updatedAction)).toBeVisible();
  await expect(updatedCard.getByText("25分")).toBeVisible();
  await expect(taskCard(page, originalTitle)).toHaveCount(0);
});

test("TODOを削除できる", async ({ page }) => {
  const title = uniqueName("E2E 削除");
  const task = await createTask(page.request, { title, isToday: true });

  await page.goto("/");
  page.once("dialog", async (dialog) => {
    expect(dialog.type()).toBe("confirm");
    await dialog.accept();
  });

  await taskCard(page, title).getByRole("button", { name: "削除", exact: true }).click();

  await expect(taskCard(page, title)).toHaveCount(0);
  const detailResponse = await page.request.get(`/api/tasks/${task.id}`);
  expect(detailResponse.status()).toBe(404);
});

test("子タスクを持つ親タスクは確認後にまとめて削除できる", async ({ page }) => {
  const parentTitle = uniqueName("E2E 親削除");
  const childTitle = uniqueName("E2E 子削除");
  const parent = await createTask(page.request, { title: parentTitle });
  const child = await createTask(page.request, { title: childTitle, parentId: parent.id });

  await page.goto("/");
  page.once("dialog", async (dialog) => {
    expect(dialog.type()).toBe("confirm");
    await dialog.accept();
  });

  await taskCard(page, parentTitle).getByRole("button", { name: "削除", exact: true }).click();

  await expect(taskCard(page, parentTitle)).toHaveCount(0);
  await expect(taskCard(page, childTitle)).toHaveCount(0);
  expect((await page.request.get(`/api/tasks/${parent.id}`)).status()).toBe(404);
  expect((await page.request.get(`/api/tasks/${child.id}`)).status()).toBe(404);
});

test("TODOを完了できる", async ({ page }) => {
  const title = uniqueName("E2E 完了");
  const task = await createTask(page.request, { title });

  await page.goto("/");
  const responsePromise = page.waitForResponse((res) =>
    res.url().includes(`/api/tasks/${task.id}/complete`) && res.request().method() === "PATCH"
  );
  await taskCard(page, title).getByRole("checkbox", { name: `${title}の完了状態を切り替える` }).click();
  await responsePromise;

  const card = taskCard(page, title);
  await expect(card.getByRole("progressbar", { name: "進捗 100%" })).toHaveAttribute("aria-valuenow", "100");
  const detail = await getTask(page.request, task.id);
  expect(detail.status).toBe("done");
  expect(detail.completedAt).not.toBeNull();
  expect(detail.startedAt).not.toBeNull();
  expect(detail.lastWorkedAt).not.toBeNull();
});

test("完了済みTODOを未完了に戻せる", async ({ page }) => {
  const title = uniqueName("E2E 完了取消");
  const task = await createTask(page.request, { title });
  const completedTask = await completeTask(page.request, task.id, true);

  await page.goto("/");
  const responsePromise = page.waitForResponse((res) =>
    res.url().includes(`/api/tasks/${task.id}/complete`) && res.request().method() === "PATCH"
  );
  await taskCard(page, title).getByRole("checkbox", { name: `${title}の完了状態を切り替える` }).click();
  await responsePromise;

  const card = taskCard(page, title);
  await expect(card.getByRole("progressbar", { name: "進捗 0%" })).toHaveAttribute("aria-valuenow", "0");
  const detail = await getTask(page.request, task.id);
  expect(detail.status).toBe("todo");
  expect(detail.completedAt).toBeNull();
  expect(detail.startedAt).toBe(completedTask.startedAt);
  expect(detail.lastWorkedAt).toBe(completedTask.lastWorkedAt);
});

test("着手ボタンで未着手リスクが解除される", async ({ page }) => {
  const title = uniqueName("E2E 未着手リスク");
  const prisma = await getPrisma();
  const oldTask = await prisma.task.create({
    data: {
      title,
      nextAction: "未着手リスクを解除する",
      status: "todo",
      priority: "medium",
      sortOrder: 10,
      createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
      lastWorkedAt: null
    }
  });

  await page.goto("/");
  const card = taskCard(page, title);
  await expect(card.getByText("未着手リスク", { exact: true })).toBeVisible();

  const responsePromise = page.waitForResponse((res) =>
    res.url().includes(`/api/tasks/${oldTask.id}/work`) && res.request().method() === "PATCH"
  );
  await card.getByRole("button", { name: "着手", exact: true }).click();
  await responsePromise;

  await expect(card.getByRole("button", { name: "作業した", exact: true })).toBeVisible();
  await expect(card.getByText("未着手リスク", { exact: true })).toHaveCount(0);
  const detail = await getTask(page.request, oldTask.id);
  expect(detail.startedAt).not.toBeNull();
  expect(detail.lastWorkedAt).not.toBeNull();
});

test("今日やるTODOだけを表示できる", async ({ page }) => {
  const todayTitle = uniqueName("E2E 今日対象");
  const otherTitle = uniqueName("E2E 今日対象外");
  await createTask(page.request, { title: todayTitle, isToday: true });
  await createTask(page.request, { title: otherTitle, isToday: false, dueDate: null });

  await page.goto("/");
  const response = await showTodayTasks(page);
  const body = await response.json();

  expect(body.meta.filter).toBe("today");
  expect(body.meta.timezone).toBe("Asia/Tokyo");
  await expect(taskCard(page, todayTitle)).toBeVisible();
  await expect(taskCard(page, otherTitle)).toHaveCount(0);
});

test("子タスクだけが今日対象の場合、親が関連表示される", async ({ page }) => {
  const parentTitle = uniqueName("E2E 今日関連親");
  const childTitle = uniqueName("E2E 今日子");
  const parent = await createTask(page.request, { title: parentTitle, isToday: false, dueDate: null, estimateMinutes: 60 });
  await createTask(page.request, { title: childTitle, parentId: parent.id, isToday: true, estimateMinutes: 10 });

  await page.goto("/");
  await showTodayTasks(page);

  const parentCard = taskCard(page, parentTitle);
  await expect(parentCard).toBeVisible();
  await expect(parentCard.getByText("関連する親タスク", { exact: true })).toBeVisible();
  await expect(taskCard(page, childTitle)).toBeVisible();
});

test("親タスクだけが今日対象の場合、今日対象外の子タスクは表示されない", async ({ page }) => {
  const parentTitle = uniqueName("E2E 今日親のみ");
  const childTitle = uniqueName("E2E 今日外子");
  const parent = await createTask(page.request, { title: parentTitle, isToday: true });
  const child = await createTask(page.request, { title: childTitle, parentId: parent.id, isToday: false, dueDate: null });
  await completeTask(page.request, child.id, true);

  await page.goto("/");
  await showTodayTasks(page);

  const parentCard = taskCard(page, parentTitle);
  await expect(parentCard).toBeVisible();
  await expect(parentCard.getByRole("progressbar", { name: "進捗 100%" })).toHaveAttribute("aria-valuenow", "100");
  await expect(taskCard(page, childTitle)).toHaveCount(0);
});

test("カテゴリを作成できる", async ({ page }) => {
  const categoryName = uniqueName("E2E カテゴリ作成");

  await page.goto("/");
  await page.locator("#category-name").fill(categoryName);
  await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/categories") && res.request().method() === "POST"),
    page.getByRole("button", { name: "作成", exact: true }).click()
  ]);

  await expect(page.getByRole("button", { name: `${categoryName}を削除`, exact: true })).toBeVisible();
  await expect(page.getByLabel("カテゴリで絞り込み")).toContainText(categoryName);
});

test("カテゴリ削除で参照タスクがカテゴリなしになる", async ({ page }) => {
  const category = await createCategory(page.request, { name: uniqueName("E2E 削除カテゴリ") });
  const title = uniqueName("E2E カテゴリ削除後タスク");
  await createTask(page.request, { title, categoryId: category.id });

  await page.goto("/");
  const card = taskCard(page, title);
  await expect(card.getByText(category.name)).toBeVisible();

  page.once("dialog", async (dialog) => {
    expect(dialog.type()).toBe("confirm");
    await dialog.accept();
  });

  await Promise.all([
    page.waitForResponse((res) => res.url().includes(`/api/categories/${category.id}`) && res.request().method() === "DELETE"),
    page.getByRole("button", { name: `${category.name}を削除`, exact: true }).click()
  ]);

  await expect(card).toBeVisible();
  await expect(card.getByText("カテゴリなし")).toBeVisible();
  await expect(page.getByLabel("カテゴリで絞り込み")).not.toContainText(category.name);
});

test("タイトルで検索できる", async ({ page }) => {
  const keyword = uniqueName("E2Eタイトル検索");
  const targetTitle = `${keyword} 対象`;
  const otherTitle = uniqueName("E2Eタイトル検索対象外");
  await createTask(page.request, { title: targetTitle });
  await createTask(page.request, { title: otherTitle });

  await page.goto("/");
  await searchTasks(page, keyword);

  await expect(taskCard(page, targetTitle)).toBeVisible();
  await expect(taskCard(page, otherTitle)).toHaveCount(0);
});

test("nextActionで検索できる", async ({ page }) => {
  const keyword = uniqueName("E2E次行動検索");
  const targetTitle = uniqueName("E2E次行動対象");
  const otherTitle = uniqueName("E2E次行動対象外");
  await createTask(page.request, { title: targetTitle, nextAction: `${keyword} を確認する` });
  await createTask(page.request, { title: otherTitle, nextAction: "検索に一致しない行動" });

  await page.goto("/");
  await searchTasks(page, keyword);

  await expect(taskCard(page, targetTitle)).toBeVisible();
  await expect(taskCard(page, otherTitle)).toHaveCount(0);
});

test("子タスクだけが検索一致した場合、親が関連表示される", async ({ page }) => {
  const keyword = uniqueName("E2E子検索語");
  const parentTitle = uniqueName("E2E検索関連親");
  const childTitle = uniqueName("E2E検索一致子");
  const parent = await createTask(page.request, { title: parentTitle, nextAction: "親は検索語を含まない" });
  await createTask(page.request, { title: childTitle, parentId: parent.id, nextAction: `${keyword} を実行する` });

  await page.goto("/");
  await searchTasks(page, keyword);

  const parentCard = taskCard(page, parentTitle);
  await expect(parentCard).toBeVisible();
  await expect(parentCard.getByText("関連する親タスク", { exact: true })).toBeVisible();
  await expect(taskCard(page, childTitle)).toBeVisible();
});

test("トップレベルタスクをドラッグで並べ替えできる", async ({ page }) => {
  const prefix = uniqueName("E2E並べ替え");
  const firstTitle = `${prefix} 1`;
  const secondTitle = `${prefix} 2`;
  const thirdTitle = `${prefix} 3`;
  const first = await createTask(page.request, { title: firstTitle });
  const second = await createTask(page.request, { title: secondTitle });
  const third = await createTask(page.request, { title: thirdTitle });

  await page.goto("/");
  await searchTasks(page, prefix);

  const responsePromise = page.waitForResponse((res) =>
    res.url().includes("/api/tasks/reorder") && res.request().method() === "PATCH"
  );
  await dragTaskOver(page, thirdTitle, firstTitle);
  const response = await responsePromise;
  const body = await response.json();
  expect(body.reorderedTaskIds).toEqual([third.id, first.id, second.id]);

  await expect(taskCard(page, thirdTitle)).toBeVisible();
  await expect(taskCard(page, firstTitle)).toBeVisible();
  await expect(taskCard(page, secondTitle)).toBeVisible();
  await expect.poll(async () => taskTitles(page, prefix)).toEqual([thirdTitle, firstTitle, secondTitle]);
});

test("論理削除済みタスクが一覧・検索・今日表示・カテゴリ表示に出ない", async ({ page }) => {
  const category = await createCategory(page.request, { name: uniqueName("E2E 論理削除カテゴリ") });
  const title = uniqueName("E2E 論理削除タスク");
  const task = await createTask(page.request, {
    title,
    isToday: true,
    categoryId: category.id,
    nextAction: "削除後に表示されないことを確認する"
  });

  await page.goto("/");
  page.once("dialog", async (dialog) => {
    expect(dialog.type()).toBe("confirm");
    await dialog.accept();
  });
  await taskCard(page, title).getByRole("button", { name: "削除", exact: true }).click();
  await expect(taskCard(page, title)).toHaveCount(0);

  await searchTasks(page, title);
  await expect(taskCard(page, title)).toHaveCount(0);

  await showTodayTasks(page);
  await expect(taskCard(page, title)).toHaveCount(0);

  await selectCategoryFilter(page, category.id);
  await expect(taskCard(page, title)).toHaveCount(0);

  expect((await page.request.get(`/api/tasks/${task.id}`)).status()).toBe(404);
});
