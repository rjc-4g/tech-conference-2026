export type ReorderSortOrder = {
  id: string;
  sortOrder: number;
};

export type ReorderableSibling = {
  id: string;
  sortOrder: number;
};

export function mergeVisibleTaskOrder(
  siblings: ReorderableSibling[],
  orderedTaskIds: string[],
  sortOrderStep = 10
): ReorderSortOrder[] {
  const requestedIds = new Set(orderedTaskIds);
  let nextRequestedIndex = 0;

  const nextOrderedIds = siblings.map((task) => {
    if (!requestedIds.has(task.id)) return task.id;

    const nextId = orderedTaskIds[nextRequestedIndex];
    nextRequestedIndex += 1;
    return nextId;
  });

  return nextOrderedIds.map((id, index) => ({
    id,
    sortOrder: (index + 1) * sortOrderStep
  }));
}
