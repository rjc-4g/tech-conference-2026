import { useState } from "react";
import { DeleteConfirmDialog } from "../../components/todo/DeleteConfirmDialog";
import { TodoFilter } from "../../components/todo/TodoFilter";
import { TodoFormModal } from "../../components/todo/TodoFormModal";
import { TodoList } from "../../components/todo/TodoList";
import { TodoProgress } from "../../components/todo/TodoProgress";
import type {
  Todo,
  TodoRequest
} from "../../types/todo";
import { calculateOverallProgress } from "../../utils/progressUtils";
import { useTodos } from "./useTodos";

const getTodayDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(
    today.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    today.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const priorityOrder: Record<
  Todo["priority"],
  number
> = {
  high: 0,
  medium: 1,
  low: 2
};

const sortTodos = (
  todoA: Todo,
  todoB: Todo
): number => {
  // 未完了を上、完了済みを下に表示する
  if (
    todoA.isCompleted !==
    todoB.isCompleted
  ) {
    return todoA.isCompleted ? 1 : -1;
  }

  // 未完了タスクは優先度順に表示する
  if (
    !todoA.isCompleted &&
    !todoB.isCompleted
  ) {
    const priorityDifference =
      priorityOrder[todoA.priority] -
      priorityOrder[todoB.priority];

    if (priorityDifference !== 0) {
      return priorityDifference;
    }
  }

  // 同じ条件の場合は登録順を使用する
  return todoA.sortOrder - todoB.sortOrder;
};

export function TodoPage() {
  const {
    todos,
    categories,
    filteredTodos,
    searchText,
    selectedCategoryId,
    loading,
    setSearchText,
    setSelectedCategoryId,
    createTodo,
    updateTodo,
    deleteTodo,
    toggleComplete,
    reorderTodos
  } = useTodos();

  const [isFormOpen, setIsFormOpen] =
    useState(false);

  const [editingTodo, setEditingTodo] =
    useState<Todo | null>(null);

  const [deletingTodo, setDeletingTodo] =
    useState<Todo | null>(null);

  const today = getTodayDate();

  /*
   * 実際に期限日が今日のタスク。
   *
   * 検索文字列やカテゴリによる絞り込みも
   * 反映された状態にする。
   */
  const actualTodayTodos =
    filteredTodos.filter(
      (todo) => todo.dueDate === today
    );

  /*
   * 今日の子タスクが持っている親タスクID。
   *
   * nullは除外し、numberだけをSetに格納する。
   */
  const parentIdsOfTodayTodos = new Set(
    actualTodayTodos.flatMap((todo) =>
      todo.parentId != null
        ? [todo.parentId]
        : []
    )
  );

  /*
   * 親タスクの期限日が今日でなくても、
   * 今日の子タスクを持っている場合は
   * 表示対象に追加する。
   *
   * 親タスクは検索結果に含まれていなくても、
   * 子タスクの表示に必要なためtodos全体から取得する。
   */
  const contextParentTodos = todos.filter(
    (todo) =>
      parentIdsOfTodayTodos.has(todo.id)
  );

  /*
   * 今日のタスクと、その表示に必要な親タスクを統合する。
   *
   * 親タスク自身も今日のタスクだった場合に
   * 重複しないようMapを使用する。
   */
  const todayTodos = Array.from(
    new Map(
      [
        ...actualTodayTodos,
        ...contextParentTodos
      ].map((todo) => [todo.id, todo])
    ).values()
  ).sort(sortTodos);

const todayProgressTargets =
  actualTodayTodos.filter((todo) => {
    const hasTodayChildren = todos.some(
      (candidate) =>
        candidate.parentId === todo.id &&
        candidate.dueDate === today
    );

    return !hasTodayChildren;
  });

const todayProgress =
  calculateOverallProgress(
    todayProgressTargets
  );

  const handleSubmit = async (
    request: TodoRequest
  ) => {
    if (editingTodo) {
      await updateTodo(
        editingTodo.id,
        request
      );
    } else {
      await createTodo(request);
    }

    setIsFormOpen(false);
    setEditingTodo(null);
  };

  const handleReorder = async (
    draggedTodoId: number,
    targetTodoId: number
  ) => {
    const draggedTodo = todayTodos.find(
      (todo) =>
        todo.id === draggedTodoId
    );

    const targetTodo = todayTodos.find(
      (todo) =>
        todo.id === targetTodoId
    );

    if (!draggedTodo || !targetTodo) {
      return;
    }

    const isSameCompletedGroup =
      draggedTodo.isCompleted ===
      targetTodo.isCompleted;

    const isSamePriorityGroup =
      draggedTodo.isCompleted ||
      draggedTodo.priority ===
        targetTodo.priority;

    if (
      !isSameCompletedGroup ||
      !isSamePriorityGroup
    ) {
      return;
    }

    const reorderTargetTodos =
      todayTodos.filter((todo) => {
        if (
          todo.isCompleted !==
          draggedTodo.isCompleted
        ) {
          return false;
        }

        if (draggedTodo.isCompleted) {
          return true;
        }

        return (
          todo.priority ===
          draggedTodo.priority
        );
      });

    const draggedIndex =
      reorderTargetTodos.findIndex(
        (todo) =>
          todo.id === draggedTodoId
      );

    const targetIndex =
      reorderTargetTodos.findIndex(
        (todo) =>
          todo.id === targetTodoId
      );

    if (
      draggedIndex === -1 ||
      targetIndex === -1
    ) {
      return;
    }

    const reordered = [
      ...reorderTargetTodos
    ];

    const [draggedTodoItem] =
      reordered.splice(
        draggedIndex,
        1
      );

    reordered.splice(
      targetIndex,
      0,
      draggedTodoItem
    );

    await reorderTodos(
      reordered.map((todo, index) => ({
        id: todo.id,
        sortOrder: index + 1
      }))
    );
  };

  if (loading) {
    return <p>読み込み中...</p>;
  }

  return (
    <>
      <TodoFilter
        searchText={searchText}
        selectedCategoryId={
          selectedCategoryId
        }
        categories={categories}
        onSearchTextChange={
          setSearchText
        }
        onCategoryChange={
          setSelectedCategoryId
        }
        onAddClick={() => {
          setEditingTodo(null);
          setIsFormOpen(true);
        }}
      />

      <section className="progress-panel">
        <TodoProgress
          value={todayProgress}
          label="今日の進捗"
        />
      </section>

      <TodoList
        title="今日のTODO"
        todos={todayTodos}
        allTodos={todos}
        targetDate={today}
        onToggleComplete={(todo) =>
          toggleComplete(todo.id)
        }
        onEdit={(todo) => {
          setEditingTodo(todo);
          setIsFormOpen(true);
        }}
        onDelete={setDeletingTodo}
        onReorder={handleReorder}
      />

      <TodoFormModal
        open={isFormOpen}
        title={
          editingTodo
            ? "TODO編集"
            : "TODO登録"
        }
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
        onCancel={() =>
          setDeletingTodo(null)
        }
        onDelete={async () => {
          if (!deletingTodo) {
            return;
          }

          await deleteTodo(
            deletingTodo.id
          );

          setDeletingTodo(null);
        }}
      />
    </>
  );
}