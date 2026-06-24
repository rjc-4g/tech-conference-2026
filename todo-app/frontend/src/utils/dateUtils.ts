export function isOverdue(dueDate?: string | null, isCompleted?: boolean): boolean {
  if (!dueDate || isCompleted) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  return due < today;
}
