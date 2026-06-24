# Step2：基本設計書

## 画面構成

- TODO一覧画面
- TODO登録モーダル
- TODO編集モーダル
- 削除確認ダイアログ

## データ項目

### TODO

| 項目名 | 内容 |
|---|---|
| id | TODO ID |
| title | タスク名 |
| description | 説明 |
| categoryId | カテゴリID |
| parentId | 親タスクID |
| priority | 優先度 |
| dueDate | 期限日 |
| isToday | 今日やる対象 |
| isCompleted | 完了状態 |
| progress | 進捗率 |
| firstAction | 最初の一歩 |
| sortOrder | 並び順 |
| createdAt | 作成日時 |
| updatedAt | 更新日時 |

### Category

| 項目名 | 内容 |
|---|---|
| id | カテゴリID |
| name | カテゴリ名 |
| color | 表示色 |

## 状態

| 状態 | 条件 |
|---|---|
| 未完了 | isCompleted = false |
| 完了 | isCompleted = true |
| 今日やる | isToday = true |
| 期限切れ | dueDate < 今日 かつ isCompleted = false |
