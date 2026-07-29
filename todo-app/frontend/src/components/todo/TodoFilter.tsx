import type { Category } from "../../types/todo";

type Props = {
  searchText: string;
  selectedCategoryId: string;
  categories: Category[];
  onSearchTextChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onAddClick: () => void;
};

export function TodoFilter({
  searchText,
  selectedCategoryId,
  categories,
  onSearchTextChange,
  onCategoryChange,
  onAddClick
}: Props) {
  return (
    <section className="toolbar">
      <input
        className="toolbar-search"
        value={searchText}
        placeholder="タスク名・説明・カテゴリで検索"
        onChange={(event) =>
          onSearchTextChange(event.target.value)
        }
      />

      <select
        className="toolbar-category"
        value={selectedCategoryId}
        onChange={(event) =>
          onCategoryChange(event.target.value)
        }
      >
        <option value="">すべてのカテゴリ</option>

        {categories.map((category) => (
          <option
            key={category.id}
            value={String(category.id)}
          >
            {category.name}
          </option>
        ))}
      </select>

      <button
        className="button primary toolbar-add-button"
        type="button"
        onClick={onAddClick}
      >
        + TODO追加
      </button>
    </section>
  );
}