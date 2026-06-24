import type { Todo } from "../types/todo";

export function calculateOverallProgress(todos: Todo[]): number {
  if (todos.length === 0) {
    return 0;
  }

  const completedCount = todos.filter((todo) => todo.isCompleted).length;
  return Math.round((completedCount / todos.length) * 100);
}

export function calculateParentProgress(parent: Todo, todos: Todo[]): number {
  const children = todos.filter((todo) => todo.parentId === parent.id);

  if (children.length === 0) {
    return parent.progress;
  }

  const completedCount = children.filter((todo) => todo.isCompleted).length;
  return Math.round((completedCount / children.length) * 100);
}
