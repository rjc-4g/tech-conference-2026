import { useState } from "react";
import { DeleteConfirmDialog } from "../../components/todo/DeleteConfirmDialog";
import { TodoFilter } from "../../components/todo/TodoFilter";
import { TodoFormModal } from "../../components/todo/TodoFormModal";
import { TodoList } from "../../components/todo/TodoList";
import { TodoProgress } from "../../components/todo/TodoProgress";
import type { Todo, TodoRequest } from "../../types/todo";
import { calculateOverallProgress } from "../../utils/progressUtils";
import { useTodos } from "./useTodos";

export function TodoPage() {
  const {
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
  } = useTodos();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [deletingTodo, setDeletingTodo] = useState<Todo | null>(null);

  const todayTodos = filteredTodos.filter((todo) => todo.isToday && !todo.isCompleted);
  const overallProgress = calculateOverallProgress(todos);

  const handleSubmit = async (request: TodoRequest) => {
    if (editingTodo) {
      await updateTodo(editingTodo.id, request);
    } else {
      await createTodo(request);
    }

    setIsFormOpen(false);
    setEditingTodo(null);
  };

  if (loading) {
    return <p>読み込み中...</p>;
  }

  return (
    <>
      <TodoFilter
        searchText={searchText}
        selectedCategoryId={selectedCategoryId}
        showTodayOnly={showTodayOnly}
        showOverdueOnly={showOverdueOnly}
        categories={categories}
        onSearchTextChange={setSearchText}
        onCategoryChange={setSelectedCategoryId}
        onShowTodayOnlyChange={setShowTodayOnly}
        onShowOverdueOnlyChange={setShowOverdueOnly}
        onAddClick={() => {
          setEditingTodo(null);
          setIsFormOpen(true);
        }}
      />

      <section className="progress-panel">
        <TodoProgress value={overallProgress} label="全体進捗" />
      </section>

      <TodoList
        title="今日やるTODO"
        todos={todayTodos}
        allTodos={todos}
        onToggleComplete={(todo) => toggleComplete(todo.id)}
        onEdit={(todo) => {
          setEditingTodo(todo);
          setIsFormOpen(true);
        }}
        onDelete={setDeletingTodo}
      />

      <TodoList
        title="全TODO"
        todos={filteredTodos}
        allTodos={todos}
        onToggleComplete={(todo) => toggleComplete(todo.id)}
        onEdit={(todo) => {
          setEditingTodo(todo);
          setIsFormOpen(true);
        }}
        onDelete={setDeletingTodo}
      />

      <TodoFormModal
        open={isFormOpen}
        title={editingTodo ? "TODO編集" : "TODO登録"}
        todo={editingTodo}
        todos={todos}
        categories={categories}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTodo(null);
        }}
        onSubmit={handleSubmit}
      />

      <DeleteConfirmDialog
        todo={deletingTodo}
        onCancel={() => setDeletingTodo(null)}
        onDelete={async () => {
          if (deletingTodo) {
            await deleteTodo(deletingTodo.id);
            setDeletingTodo(null);
          }
        }}
      />
    </>
  );
}
