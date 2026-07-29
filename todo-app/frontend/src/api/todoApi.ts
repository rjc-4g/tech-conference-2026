import type { Category, Todo, TodoRequest } from "../types/todo";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {})
    },
    ...options
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const todoApi = {
  getTodos: () => request<Todo[]>("/api/todos"),

  createTodo: (body: TodoRequest) =>
    request<Todo>("/api/todos", {
      method: "POST",
      body: JSON.stringify(body)
    }),

  updateTodo: (id: number, body: TodoRequest) =>
    request<Todo>(`/api/todos/${id}`, {
      method: "PUT",
      body: JSON.stringify(body)
    }),

  deleteTodo: (id: number) =>
    request<void>(`/api/todos/${id}`, {
      method: "DELETE"
    }),

  toggleComplete: (id: number) =>
    request<Todo>(`/api/todos/${id}/complete`, {
      method: "PATCH"
    }),

  reorderTodos: (
    items: Array<{
      id: number;
      sortOrder: number;
    }>
  ) =>
    request<void>("/api/todos/reorder", {
      method: "PATCH",
      body: JSON.stringify({ items })
    }),

  getCategories: () =>
    request<Category[]>("/api/categories")
};