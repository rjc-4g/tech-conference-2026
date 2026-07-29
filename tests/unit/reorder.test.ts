import { describe, expect, it } from "vitest";
import { mergeVisibleTaskOrder } from "@/lib/reorder";

describe("mergeVisibleTaskOrder", () => {
  it("表示中タスクが元々存在していたスロットに新順序を差し込み、非表示タスクの位置を維持する", () => {
    const result = mergeVisibleTaskOrder(
      [
        { id: "task_1", sortOrder: 10 },
        { id: "task_2", sortOrder: 20 },
        { id: "task_3", sortOrder: 30 },
        { id: "task_4", sortOrder: 40 },
        { id: "task_5", sortOrder: 50 }
      ],
      ["task_3", "task_1", "task_5"]
    );

    expect(result).toEqual([
      { id: "task_3", sortOrder: 10 },
      { id: "task_2", sortOrder: 20 },
      { id: "task_1", sortOrder: 30 },
      { id: "task_4", sortOrder: 40 },
      { id: "task_5", sortOrder: 50 }
    ]);
  });

  it("全件が表示中の場合はorderedTaskIdsの順序をそのまま全体順序に反映する", () => {
    const result = mergeVisibleTaskOrder(
      [
        { id: "task_1", sortOrder: 10 },
        { id: "task_2", sortOrder: 20 },
        { id: "task_3", sortOrder: 30 }
      ],
      ["task_3", "task_2", "task_1"]
    );

    expect(result).toEqual([
      { id: "task_3", sortOrder: 10 },
      { id: "task_2", sortOrder: 20 },
      { id: "task_1", sortOrder: 30 }
    ]);
  });

  it("orderedTaskIdsが1件だけの場合は全体順序を変えない", () => {
    const result = mergeVisibleTaskOrder(
      [
        { id: "task_1", sortOrder: 10 },
        { id: "task_2", sortOrder: 20 },
        { id: "task_3", sortOrder: 30 }
      ],
      ["task_2"]
    );

    expect(result).toEqual([
      { id: "task_1", sortOrder: 10 },
      { id: "task_2", sortOrder: 20 },
      { id: "task_3", sortOrder: 30 }
    ]);
  });

  it("末尾の表示中タスクを先頭スロットへ移動しても非表示タスクの位置を維持する", () => {
    const result = mergeVisibleTaskOrder(
      [
        { id: "task_1", sortOrder: 10 },
        { id: "task_2", sortOrder: 20 },
        { id: "task_3", sortOrder: 30 },
        { id: "task_4", sortOrder: 40 },
        { id: "task_5", sortOrder: 50 }
      ],
      ["task_5", "task_1", "task_3"]
    );

    expect(result).toEqual([
      { id: "task_5", sortOrder: 10 },
      { id: "task_2", sortOrder: 20 },
      { id: "task_1", sortOrder: 30 },
      { id: "task_4", sortOrder: 40 },
      { id: "task_3", sortOrder: 50 }
    ]);
  });

});
