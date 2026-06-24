import type { Category } from "../../types/todo";

type Props = {
  searchText: string;
  selectedCategoryId: string;
  showTodayOnly: boolean;
  showOverdueOnly: boolean;
  categories: Category[];
  onSearchTextChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onShowTodayOnlyChange: (value: boolean) => void;
  onShowOverdueOnlyChange: (value: boolean) => void;
  onAddClick: () => void;
};

export function TodoFilter({
  searchText,
  selectedCategoryId,
  showTodayOnly,
  showOverdueOnly,
  categories,
  onSearchTextChange,
  onCategoryChange,
  onShowTodayOnlyChange,
  onShowOverdueOnlyChange,
  onAddClick
}: Props) {
  return (
    <section className="toolbar">
      <input
        value={searchText}
        placeholder="タスク名・説明・カテゴリで検索"
        onChange={(event) => onSearchTextChange(event.target.value)}
      />

      <select value={selectedCategoryId} onChange={(event) => onCategoryChange(event.target.value)}>
        <option value="">すべてのカテゴリ</option>
        {categories.map((category) => (
          <option key={category.id} value={String(category.id)}>
            {category.name}
          </option>
        ))}
      </select>

      <label>
        <input
          type="checkbox"
          checked={showTodayOnly}
          onChange={(event) => onShowTodayOnlyChange(event.target.checked)}
        />
        今日やる
      </label>

      <label>
        <input
          type="checkbox"
          checked={showOverdueOnly}
          onChange={(event) => onShowOverdueOnlyChange(event.target.checked)}
        />
        期限切れ
      </label>

      <button className="button primary" type="button" onClick={onAddClick}>
        + TODO追加
      </button>
    </section>
  );
}
