import type { Todo } from "../../types/todo";
import { TodoCard } from "./TodoCard";

type Props = {
  title: string;
  todos: Todo[];
  allTodos: Todo[];
  onToggleComplete: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
};

export function TodoList({ title, todos, allTodos, onToggleComplete, onEdit, onDelete }: Props) {
  const parentTodos = todos.filter((todo) => todo.parentId == null);

  return (
    <section className="todo-section">
      <h2>{title}</h2>

      {parentTodos.length === 0 && <p>TODOはありません。</p>}

      {parentTodos.map((todo) => {
        const childrenTodos = allTodos
          .filter((child) => child.parentId === todo.id)
          .sort((a, b) => a.sortOrder - b.sortOrder);

        return (
          <TodoCard
            key={todo.id}
            todo={todo}
            childrenTodos={childrenTodos}
            onToggleComplete={onToggleComplete}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        );
      })}
    </section>
  );
}
