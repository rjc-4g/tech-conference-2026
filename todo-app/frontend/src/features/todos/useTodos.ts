import { useEffect, useMemo, useState } from "react";
import { todoApi } from "../../api/todoApi";
import type { Category, Todo, TodoRequest } from "../../types/todo";
import { isOverdue } from "../../utils/dateUtils";

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [showTodayOnly, setShowTodayOnly] = useState(false);
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [todoResult, categoryResult] = await Promise.all([
      todoApi.getTodos(),
      todoApi.getCategories()
    ]);

    setTodos(todoResult.sort((a, b) => a.sortOrder - b.sortOrder));
    setCategories(categoryResult);
    setLoading(false);
  };

  useEffect(() => {
    load().catch(() => {
      setLoading(false);
    });
  }, []);

  const filteredTodos = useMemo(() => {
    return todos.filter((todo) => {
      const keyword = searchText.trim().toLowerCase();
      const matchesKeyword =
        !keyword ||
        todo.title.toLowerCase().includes(keyword) ||
        (todo.description ?? "").toLowerCase().includes(keyword) ||
        (todo.category?.name ?? "").toLowerCase().includes(keyword);

      const matchesCategory =
        !selectedCategoryId || String(todo.category?.id ?? todo.categoryId ?? "") === selectedCategoryId;

      const matchesToday = !showTodayOnly || todo.isToday;
      const matchesOverdue = !showOverdueOnly || isOverdue(todo.dueDate, todo.isCompleted);

      return matchesKeyword && matchesCategory && matchesToday && matchesOverdue;
    });
  }, [todos, searchText, selectedCategoryId, showTodayOnly, showOverdueOnly]);

  const createTodo = async (request: TodoRequest) => {
    await todoApi.createTodo(request);
    await load();
  };

  const updateTodo = async (id: number, request: TodoRequest) => {
    await todoApi.updateTodo(id, request);
    await load();
  };

  const deleteTodo = async (id: number) => {
    await todoApi.deleteTodo(id);
    await load();
  };

  const toggleComplete = async (id: number) => {
    await todoApi.toggleComplete(id);
    await load();
  };

  return {
    todos,
    categories,
    filteredTodos,
    searchText,
    selectedCategoryId,
    showTodayOnly,
    showOverdueOnly,
    loading,
    setSearchText,
    setSelectedCategoryId,
    setShowTodayOnly,
    setShowOverdueOnly,
    createTodo,
    updateTodo,
    deleteTodo,
    toggleComplete
  };
}
