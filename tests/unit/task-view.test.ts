import { describe, expect, it } from "vitest";
import { getTodayYmdInAppTimezone } from "@/lib/date";
import { buildDisplayTasksForFilter, buildTaskListMeta } from "@/lib/task-query";
import {
  buildTaskViews,
  calculateTaskProgress,
  getTaskDateState,
  type TaskWithCategory
} from "@/lib/task-view";

function task(overrides: Partial<TaskWithCategory> = {}): TaskWithCategory {
  const now = new Date("2026-07-29T00:00:00+09:00");

  return {
    id: overrides.id ?? `task_${Math.random().toString(36).slice(2)}`,
    title: overrides.title ?? "テストタスク",
    description: overrides.description ?? null,
    status: overrides.status ?? "todo",
    priority: overrides.priority ?? "medium",
    dueDate: overrides.dueDate ?? null,
    isToday: overrides.isToday ?? false,
    parentId: overrides.parentId ?? null,
    categoryId: overrides.categoryId ?? null,
    nextAction: overrides.nextAction ?? "次の行動",
    estimateMinutes: overrides.estimateMinutes ?? null,
    sortOrder: overrides.sortOrder ?? 10,
    startedAt: overrides.startedAt ?? null,
    lastWorkedAt: overrides.lastWorkedAt ?? null,
    completedAt: overrides.completedAt ?? null,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    deletedAt: overrides.deletedAt ?? null,
    category: overrides.category ?? null
  };
}

describe("task view helpers", () => {
  it("子タスクがある場合は未削除の子タスク完了率をMath.roundで進捗率にする", () => {
    const parent = task({ id: "parent" });
    const children = [
      task({ id: "child_1", parentId: "parent", status: "done" }),
      task({ id: "child_2", parentId: "parent", status: "todo" }),
      task({ id: "child_3", parentId: "parent", status: "todo" })
    ];

    expect(calculateTaskProgress(parent, children)).toBe(33);
  });

  it("子タスクがない場合は完了なら100%、未完了なら0%にする", () => {
    expect(calculateTaskProgress(task({ status: "done" }), [])).toBe(100);
    expect(calculateTaskProgress(task({ status: "todo" }), [])).toBe(0);
  });

  it("Asia/Tokyo基準で今日の日付を判定する", () => {
    const now = new Date("2026-07-28T15:30:00.000Z");

    expect(getTodayYmdInAppTimezone(now)).toBe("2026-07-29");
  });

  it("今日やる判定はisToday、今日期限、期限切れ未完了を対象にする", () => {
    const today = "2026-07-29";

    expect(getTaskDateState(task({ isToday: true }), today).isTodayTarget).toBe(true);
    expect(getTaskDateState(task({ dueDate: new Date("2026-07-29T00:00:00+09:00") }), today).isTodayTarget).toBe(true);

    const overdue = getTaskDateState(
      task({ dueDate: new Date("2026-07-28T00:00:00+09:00"), status: "todo" }),
      today
    );
    expect(overdue.isOverdue).toBe(true);
    expect(overdue.isTodayTarget).toBe(true);

    const completedOverdue = getTaskDateState(
      task({ dueDate: new Date("2026-07-28T00:00:00+09:00"), status: "done" }),
      today
    );
    expect(completedOverdue.isOverdue).toBe(false);
    expect(completedOverdue.isTodayTarget).toBe(false);
  });

  it("作成から24時間以上、未完了、進捗0%、lastWorkedAtなしなら未着手リスクにする", () => {
    const now = new Date("2026-07-29T12:00:00+09:00");
    const oldTask = task({ createdAt: new Date("2026-07-28T11:59:00+09:00") });
    const [view] = buildTaskViews([oldTask], now, [oldTask], { today: "2026-07-29" });

    expect(view.hasUnstartedRisk).toBe(true);

    const workedTask = task({
      createdAt: new Date("2026-07-28T11:59:00+09:00"),
      lastWorkedAt: new Date("2026-07-29T10:00:00+09:00")
    });
    const [workedView] = buildTaskViews([workedTask], now, [workedTask], { today: "2026-07-29" });

    expect(workedView.hasUnstartedRisk).toBe(false);
  });

  it("子タスクだけが今日条件に一致する場合、親をcontextOnlyとして含める", () => {
    const today = "2026-07-29";
    const parent = task({ id: "parent", title: "親", estimateMinutes: 60 });
    const child = task({ id: "child", parentId: "parent", title: "子", isToday: true, estimateMinutes: 30 });
    const allTasks = [parent, child];

    const result = buildDisplayTasksForFilter(allTasks, "today", "", today);
    const views = buildTaskViews(result.displayTasks, new Date("2026-07-29T12:00:00+09:00"), allTasks, {
      matchedTaskIds: result.matchedTaskIds,
      contextOnlyTaskIds: result.contextOnlyTaskIds,
      today
    });
    const meta = buildTaskListMeta("today", "", today, views);

    const parentView = views.find((item) => item.id === "parent");
    const childView = views.find((item) => item.id === "child");

    expect(parentView?.contextOnly).toBe(true);
    expect(parentView?.matchedByFilter).toBe(false);
    expect(childView?.contextOnly).toBe(false);
    expect(childView?.matchedByFilter).toBe(true);
    expect(meta.totalEstimateMinutes).toBe(30);
  });

  it("親タスクだけが今日条件に一致する場合、子タスクは表示対象にしない", () => {
    const today = "2026-07-29";
    const parent = task({ id: "parent", isToday: true, estimateMinutes: 60 });
    const child = task({ id: "child", parentId: "parent", isToday: false, estimateMinutes: 30 });

    const result = buildDisplayTasksForFilter([parent, child], "today", "", today);

    expect(result.displayTasks.map((item) => item.id)).toEqual(["parent"]);
  });

  it("子タスクだけが検索条件に一致する場合、親をcontextOnlyとして含める", () => {
    const today = "2026-07-29";
    const parent = task({ id: "parent", title: "親タスク" });
    const child = task({ id: "child", parentId: "parent", title: "検索対象の子タスク" });

    const result = buildDisplayTasksForFilter([parent, child], "all", "検索対象", today);
    const views = buildTaskViews(result.displayTasks, new Date("2026-07-29T12:00:00+09:00"), [parent, child], {
      matchedTaskIds: result.matchedTaskIds,
      contextOnlyTaskIds: result.contextOnlyTaskIds,
      today
    });

    expect(views.find((item) => item.id === "parent")?.contextOnly).toBe(true);
    expect(views.find((item) => item.id === "child")?.matchedByFilter).toBe(true);
  });
  it("カテゴリフィルタで子タスクだけが一致する場合、親をcontextOnlyとして含める", () => {
    const today = "2026-07-29";
    const parent = task({ id: "parent", title: "親タスク", categoryId: null });
    const child = task({
      id: "child",
      parentId: "parent",
      title: "カテゴリ一致の子タスク",
      categoryId: "category-a",
      category: { id: "category-a", name: "学習", color: "#60a5fa" }
    });
    const other = task({ id: "other", title: "別カテゴリ", categoryId: "category-b" });

    const result = buildDisplayTasksForFilter([parent, child, other], "all", "", today, "category-a");
    const views = buildTaskViews(result.displayTasks, new Date("2026-07-29T12:00:00+09:00"), [parent, child, other], {
      matchedTaskIds: result.matchedTaskIds,
      contextOnlyTaskIds: result.contextOnlyTaskIds,
      today
    });

    expect(result.displayTasks.map((item) => item.id)).toEqual(["parent", "child"]);
    expect(views.find((item) => item.id === "parent")?.contextOnly).toBe(true);
    expect(views.find((item) => item.id === "child")?.matchedByFilter).toBe(true);
    expect(views.find((item) => item.id === "other")).toBeUndefined();
  });

});
