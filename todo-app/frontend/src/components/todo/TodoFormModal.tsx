import { useEffect, useState } from "react";
import type { Category, Priority, Todo, TodoRequest } from "../../types/todo";

type Props = {
  open: boolean;
  title: string;
  todo?: Todo | null;
  todos: Todo[];
  categories: Category[];
  onClose: () => void;
  onSubmit: (request: TodoRequest) => Promise<void>;
};

const initialForm: TodoRequest = {
  title: "",
  description: "",
  categoryId: null,
  parentId: null,
  priority: "medium",
  dueDate: "",
  isToday: false,
  isCompleted: false,
  progress: 0,
  firstAction: "",
  sortOrder: 0
};

export function TodoFormModal({ open, title, todo, todos, categories, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<TodoRequest>(initialForm);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!open) {
      return;
    }

    if (todo) {
      setForm({
        title: todo.title,
        description: todo.description ?? "",
        categoryId: todo.category?.id ?? todo.categoryId ?? null,
        parentId: todo.parentId ?? null,
        priority: todo.priority,
        dueDate: todo.dueDate ?? "",
        isToday: todo.isToday,
        isCompleted: todo.isCompleted,
        progress: todo.progress,
        firstAction: todo.firstAction ?? "",
        sortOrder: todo.sortOrder
      });
    } else {
      setForm(initialForm);
    }

    setError("");
  }, [open, todo]);

  if (!open) {
    return null;
  }

  const update = <K extends keyof TodoRequest>(key: K, value: TodoRequest[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setError("タスク名を入力してください");
      return;
    }

    if (form.progress < 0 || form.progress > 100) {
      setError("進捗率は0〜100で入力してください");
      return;
    }

    await onSubmit({
      ...form,
      title: form.title.trim(),
      description: form.description?.trim(),
      firstAction: form.firstAction?.trim(),
      categoryId: form.categoryId || null,
      parentId: form.parentId || null,
      dueDate: form.dueDate || null
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>{title}</h2>

        <div className="form-grid">
          <label className="form-field">
            タスク名
            <input value={form.title} onChange={(event) => update("title", event.target.value)} />
          </label>

          <label className="form-field">
            説明
            <textarea
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
            />
          </label>

          <label className="form-field">
            カテゴリ
            <select
              value={form.categoryId ?? ""}
              onChange={(event) =>
                update("categoryId", event.target.value ? Number(event.target.value) : null)
              }
            >
              <option value="">未分類</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            親タスク
            <select
              value={form.parentId ?? ""}
              onChange={(event) =>
                update("parentId", event.target.value ? Number(event.target.value) : null)
              }
            >
              <option value="">なし</option>
              {todos
                .filter((candidate) => candidate.id !== todo?.id)
                .map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.title}
                  </option>
                ))}
            </select>
          </label>

          <label className="form-field">
            優先度
            <select value={form.priority} onChange={(event) => update("priority", event.target.value as Priority)}>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </label>

          <label className="form-field">
            期限日
            <input
              type="date"
              value={form.dueDate ?? ""}
              onChange={(event) => update("dueDate", event.target.value)}
            />
          </label>

          <label>
            <input
              type="checkbox"
              checked={form.isToday}
              onChange={(event) => update("isToday", event.target.checked)}
            />
            今日やる
          </label>

          <label className="form-field">
            進捗率
            <input
              type="number"
              min={0}
              max={100}
              value={form.progress}
              onChange={(event) => update("progress", Number(event.target.value))}
            />
          </label>

          <label className="form-field">
            最初の一歩
            <input
              value={form.firstAction}
              placeholder="例：資料の見出しだけ作る"
              onChange={(event) => update("firstAction", event.target.value)}
            />
          </label>
        </div>

        {error && <p role="alert">{error}</p>}

        <div className="form-actions">
          <button className="button" type="button" onClick={onClose}>
            キャンセル
          </button>
          <button className="button primary" type="button" onClick={handleSubmit}>
            {todo ? "更新" : "登録"}
          </button>
        </div>
      </div>
    </div>
  );
}
