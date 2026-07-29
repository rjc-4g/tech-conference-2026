import { useState } from "react";
import type { Todo } from "../../types/todo";
import { TodoCard } from "./TodoCard";

type Props = {
  title: string;
  todos: Todo[];
  allTodos: Todo[];
  onToggleComplete: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
  onReorder: (
    draggedTodoId: number,
    targetTodoId: number
  ) => Promise<void>;
};

export function TodoList({
  title,
  todos,
  allTodos,
  onToggleComplete,
  onEdit,
  onDelete,
  onReorder
}: Props) {
  const [draggedTodoId, setDraggedTodoId] =
    useState<number | null>(null);

  const [dragOverTodoId, setDragOverTodoId] =
    useState<number | null>(null);

  const parentTodos = todos.filter(
    (todo) => todo.parentId == null
  );

  const handleDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    todoId: number
  ) => {
    setDraggedTodoId(todoId);

    // FirefoxなどではsetDataがないとドラッグできない場合がある
    event.dataTransfer.setData(
      "text/plain",
      String(todoId)
    );

    event.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    targetTodoId: number
  ) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverTodoId(targetTodoId);
  };

  const handleDrop = async (
    event: React.DragEvent<HTMLDivElement>,
    targetTodoId: number
  ) => {
    event.preventDefault();

    const transferredId = Number(
      event.dataTransfer.getData("text/plain")
    );

    const sourceTodoId =
      draggedTodoId ?? transferredId;

    setDraggedTodoId(null);
    setDragOverTodoId(null);

    if (
      !sourceTodoId ||
      sourceTodoId === targetTodoId
    ) {
      return;
    }

    await onReorder(
      sourceTodoId,
      targetTodoId
    );
  };

  const handleDragEnd = () => {
    setDraggedTodoId(null);
    setDragOverTodoId(null);
  };

  return (
    <section className="todo-section">
      <h2>{title}</h2>

      {parentTodos.length === 0 && (
        <p>TODOはありません。</p>
      )}

      {parentTodos.map((todo) => {
        const childrenTodos = allTodos
          .filter(
            (child) =>
              child.parentId === todo.id
          )
          .sort(
            (a, b) =>
              a.sortOrder - b.sortOrder
          );

        const classNames = [
          "todo-drag-wrapper",
          draggedTodoId === todo.id
            ? "dragging"
            : "",
          dragOverTodoId === todo.id
            ? "drag-over"
            : ""
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <div
            key={todo.id}
            className={classNames}
            draggable
            onDragStart={(event) =>
              handleDragStart(
                event,
                todo.id
              )
            }
            onDragOver={(event) =>
              handleDragOver(
                event,
                todo.id
              )
            }
            onDrop={(event) =>
              void handleDrop(
                event,
                todo.id
              )
            }
            onDragEnd={handleDragEnd}
          >
            <TodoCard
              todo={todo}
              childrenTodos={
                childrenTodos
              }
              onToggleComplete={
                onToggleComplete
              }
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        );
      })}
    </section>
  );
}