# Design Document

## 目的
- AI開発の技術検証
- AIDDとAIADの比較

## 対象ユーザ
- 一般ユーザ（汎用的なアプリ）

## 解決したい課題
- タスクを登録して満足してしまう
- 優先順位が決められない
- 期限切れタスクに気づけない

---

## API一覧（概略）
- `GET /api/v1/tasks` — 全タスク取得（クエリで今日のみ/カテゴリ絞り込み）
- `POST /api/v1/tasks` — タスク作成（body: title, description, parentId?, due_date?, category_id?, is_today?）
- `GET /api/v1/tasks/:id` — タスク取得
- `PUT /api/v1/tasks/:id` — タスク更新（全体更新）
- `PATCH /api/v1/tasks/:id` — タスク部分更新（例: is_today のトグル）
- `DELETE /api/v1/tasks/:id` — タスク削除（子孫を含む再帰削除）
- `POST /api/v1/tasks/reorder` — 並び替え更新（body: orderUpdates: [{id, order_num}, ...]）
- `POST /api/v1/tasks/:id/set_today` — 親と子孫をまとめて `is_today` に設定（atomic）
- `POST /api/v1/tasks/:id/set_complete` — 親と子孫をまとめて完了（status='done', progress=100, completed_at）

- `GET /api/v1/categories`, `POST /api/v1/categories`, `PUT /api/v1/categories/:id`, `DELETE /api/v1/categories/:id`

---

## DB 定義（主要テーブル）

- `tasks` テーブル（SQLite）
  - `id` TEXT PRIMARY KEY — UUID
  - `title` TEXT NOT NULL
  - `description` TEXT
  - `status` TEXT — ('todo' | 'doing' | 'done')
  - `category_id` TEXT NULL — `categories.id` 参照
  - `parent_id` TEXT NULL — 親タスクの `id`
  - `order_num` INTEGER — 同階層内の並び順
  - `progress` INTEGER — 0-100
  - `is_today` INTEGER — 0/1 フラグ
  - `due_date` TEXT NULL — ISO 日時
  - `created_at` TEXT
  - `updated_at` TEXT
  - `completed_at` TEXT NULL

- `categories` テーブル
  - `id` TEXT PRIMARY KEY
  - `name` TEXT NOT NULL
  - `color` TEXT NULL

（注）再帰操作は SQL の再帰 CTE を使い、親→子孫の一括更新／削除を行う。

---

## 画面構成（概略）
- メイン画面 (`App.tsx`)
  - 上部: 検索 / フィルタ（カテゴリ / 今日/全て 切替） / 新規ボタン
  - セクション: 「今日のTODO」 — `is_today=1` のツリー表示（親と子を入れ子で表示）
  - セクション: 「全タスク」 — `is_today=0` のツリー表示
  - 各タスク行: タイトル、カテゴリバッジ、期限、進捗バー、操作ボタン（▲/▼、子タスク新規、編集、完了、削除）
  - 子タスク: 親の下に入れ子で表示。子タスクには個別の「今日やる」ボタンは表示しない（親で一括設定）

- タスクモーダル (`TaskModal.tsx`)
  - 用途: 新規作成 / 編集
  - 入力項目: タイトル（必須）、説明、期限（datetime）、カテゴリ、親タスク（新規子作成時は親で固定）

---

## 運用上の留意点
- `is_today` フラグを親子で一貫して扱う（子作成時に親の `is_today` を継承、親の一括更新は atomic に行う）
- 並び替えは階層内の `order_num` を更新してサーバへ一括送信する設計
- 期限切れの強調表示と完了済みの表示（背景色・ボタン非表示）を UX として実装済み

作成日: 2026-06-25
