import type { Todo } from "../../types/todo";

type Props = {
  todo: Todo | null;
  onCancel: () => void;
  onDelete: () => Promise<void>;
};

export function DeleteConfirmDialog({ todo, onCancel, onDelete }: Props) {
  if (!todo) {
    return null;
  }

  return (
    <div className="dialog-backdrop">
      <div className="dialog-content">
        <h2>TODO削除確認</h2>
        <p>以下のTODOを削除します。</p>
        <p>「{todo.title}」</p>
        <p>本当に削除してよろしいですか？</p>

        <div className="dialog-actions">
          <button className="button" type="button" onClick={onCancel}>
            キャンセル
          </button>
          <button className="button danger" type="button" onClick={onDelete}>
            削除
          </button>
        </div>
      </div>
    </div>
  );
}
