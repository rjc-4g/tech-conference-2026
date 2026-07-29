import { expect, test } from "@playwright/test";
import { createCategory, createTask, selectCategoryFilter, taskCard, uniqueName } from "./helpers";

test("TODO登録モーダルから新規TODOを登録できる", async ({ page }) => {
  const title = uniqueName("E2E TODO");

  await page.goto("/");
  await page.getByRole("button", { name: "TODO追加", exact: true }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/タイトル/).fill(title);
  await dialog.getByLabel(/次にやる具体的な行動/).fill("E2Eテストで登録結果を確認する");
  await dialog.getByLabel(/見積時間/).fill("15");
  await dialog.getByRole("button", { name: "登録する", exact: true }).click();

  const createdCard = taskCard(page, title);
  await expect(createdCard).toBeVisible();
  await expect(createdCard.getByText("E2Eテストで登録結果を確認する")).toBeVisible();
});

test("カテゴリでTODOを絞り込める", async ({ page }) => {
  const category = await createCategory(page.request, { name: uniqueName("E2Eカテゴリ") });
  const otherCategory = await createCategory(page.request, { name: uniqueName("E2E別カテゴリ") });
  const targetTitle = uniqueName("E2Eカテゴリ対象");
  const otherTitle = uniqueName("E2Eカテゴリ対象外");

  await createTask(page.request, {
    title: targetTitle,
    nextAction: "カテゴリフィルタで表示されることを確認する",
    categoryId: category.id
  });
  await createTask(page.request, {
    title: otherTitle,
    nextAction: "カテゴリフィルタでは非表示になることを確認する",
    categoryId: otherCategory.id
  });

  await page.goto("/");

  const response = await selectCategoryFilter(page, category.id);
  const body = await response.json();
  expect(body.meta.categoryId).toBe(category.id);

  await expect(taskCard(page, targetTitle)).toBeVisible();
  await expect(taskCard(page, otherTitle)).toHaveCount(0);
});
