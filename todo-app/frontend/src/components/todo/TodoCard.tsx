import type { Todo } from "../../types/todo";
import { isOverdue } from "../../utils/dateUtils";
import { TodoProgress } from "./TodoProgress";

type Props = {
  todo: Todo;
  childrenTodos?: Todo[];
  onToggleComplete: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
};

const priorityLabel = {
  high: "高",
  medium: "中",
  low: "低"
};

export function TodoCard({ todo, childrenTodos = [], onToggleComplete, onEdit, onDelete }: Props) {
  const overdue = isOverdue(todo.dueDate, todo.isCompleted);

  return (
    <article className={`todo-card ${todo.isCompleted ? "completed" : ""}`}>
      <div className="todo-card-header">
        <div>
          <label className="todo-title">
            <input
              type="checkbox"
              checked={todo.isCompleted}
              onChange={() => onToggleComplete(todo)}
            />
            <span className={todo.isCompleted ? "todo-title done" : "todo-title"}>
              {todo.title}
            </span>
          </label>

          <div className="todo-meta">
            <span className="badge">{todo.category?.name ?? "未分類"}</span>
            <span className="badge">優先度：{priorityLabel[todo.priority]}</span>
            {todo.dueDate && (
              <span className={`badge ${overdue ? "overdue" : ""}`}>
                {overdue ? "期限切れ：" : "期限："}{todo.dueDate}
              </span>
            )}
            {todo.isToday && <span className="badge">今日やる</span>}
          </div>

          {todo.description && <p className="todo-meta">{todo.description}</p>}

          {todo.firstAction && (
            <p className="todo-first-action">まずやること：{todo.firstAction}</p>
          )}
        </div>

        <div className="todo-actions">
          <button className="button" type="button" onClick={() => onEdit(todo)}>
            編集
          </button>
          <button className="button danger" type="button" onClick={() => onDelete(todo)}>
            削除
          </button>
        </div>
      </div>

      <TodoProgress value={todo.progress} label="進捗" />

      {childrenTodos.length > 0 && (
        <div className="child-list">
          {childrenTodos.map((child) => (
            <TodoCard
              key={child.id}
              todo={child}
              onToggleComplete={onToggleComplete}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </article>
  );
}
