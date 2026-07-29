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
- `POST /api/v1/tasks` — タスク作成（body: title, description, scheduledAt, dueDate, categoryId, parentId?, is_today?）
- `GET /api/v1/tasks/:id` — タスク取得
- `PUT /api/v1/tasks/:id` — タスク更新（全体更新。`scheduledAt` は必須）
- `PATCH /api/v1/tasks/:id` — タスク部分更新（例: is_today のトグル）
- `DELETE /api/v1/tasks/:id` — タスク削除（子孫を含む再帰削除）
- `POST /api/v1/tasks/reorder` — 並び替え更新（body: orderUpdates: [{id, order_num}, ...]）
- `POST /api/v1/tasks/:id/set_today` — 親と子孫をまとめて `is_today` に設定（atomic）
- `POST /api/v1/tasks/:id/set_complete` — 親と子孫をまとめて完了（status='done', progress=100, completed_at）

- `GET /api/v1/categories`, `POST /api/v1/categories`, `PUT /api/v1/categories/:id`, `DELETE /api/v1/categories/:id`

---

## API リクエスト/レスポンス例

### 1. タスク作成 `POST /api/v1/tasks`

**リクエスト:**
```json
{
  "title": "プロジェクトA の設計書作成",
  "description": "システム全体のアーキテクチャを定義する",
  "scheduled_at": "2026-07-30T09:00:00Z",
  "due_date": "2026-08-05T18:00:00Z",
  "category_id": "cat-001",
  "parent_id": null,
  "is_today": 1
}
```

**レスポンス (201 Created):**
```json
{
  "id": "task-abc123",
  "title": "プロジェクトA の設計書作成",
  "description": "システム全体のアーキテクチャを定義する",
  "status": "todo",
  "category_id": "cat-001",
  "parent_id": null,
  "order_num": 1,
  "progress": 0,
  "is_today": 1,
  "scheduled_at": "2026-07-30T09:00:00Z",
  "due_date": "2026-08-05T18:00:00Z",
  "created_at": "2026-07-29T12:00:00Z",
  "updated_at": "2026-07-29T12:00:00Z",
  "completed_at": null
}
```

### 2. 全タスク取得 `GET /api/v1/tasks?today_only=0`

**レスポンス (200 OK):**
```json
{
  "tasks": [
    {
      "id": "task-abc123",
      "title": "プロジェクトA の設計書作成",
      "description": "システム全体のアーキテクチャを定義する",
      "status": "todo",
      "category_id": "cat-001",
      "parent_id": null,
      "order_num": 1,
      "progress": 0,
      "is_today": 1,
      "scheduled_at": "2026-07-30T09:00:00Z",
      "due_date": "2026-08-05T18:00:00Z",
      "created_at": "2026-07-29T12:00:00Z",
      "updated_at": "2026-07-29T12:00:00Z",
      "completed_at": null,
      "children": [
        {
          "id": "task-def456",
          "title": "API 設計書 作成",
          "description": "REST API のエンドポイント定義",
          "status": "doing",
          "category_id": "cat-001",
          "parent_id": "task-abc123",
          "order_num": 1,
          "progress": 50,
          "is_today": 1,
          "scheduled_at": "2026-07-29T14:00:00Z",
          "due_date": "2026-08-01T18:00:00Z",
          "created_at": "2026-07-29T12:30:00Z",
          "updated_at": "2026-07-29T13:00:00Z",
          "completed_at": null,
          "children": []
        }
      ]
    }
  ]
}
```

### 3. タスク更新 `PUT /api/v1/tasks/:id`

**リクエスト:**
```json
{
  "title": "プロジェクトA の設計書作成（重要）",
  "description": "システム全体のアーキテクチャとテクノロジースタックを定義する",
  "scheduled_at": "2026-07-31T09:00:00Z",
  "due_date": "2026-08-06T18:00:00Z",
  "category_id": "cat-001",
  "status": "doing",
  "progress": 30
}
```

**レスポンス (200 OK):**
```json
{
  "id": "task-abc123",
  "title": "プロジェクトA の設計書作成（重要）",
  "description": "システム全体のアーキテクチャとテクノロジースタックを定義する",
  "status": "doing",
  "category_id": "cat-001",
  "parent_id": null,
  "order_num": 1,
  "progress": 30,
  "is_today": 1,
  "scheduled_at": "2026-07-31T09:00:00Z",
  "due_date": "2026-08-06T18:00:00Z",
  "created_at": "2026-07-29T12:00:00Z",
  "updated_at": "2026-07-29T13:30:00Z",
  "completed_at": null
}
```

### 4. タスク部分更新（is_today トグル） `PATCH /api/v1/tasks/:id`

**リクエスト:**
```json
{
  "is_today": 0
}
```

**レスポンス (200 OK):**
```json
{
  "id": "task-abc123",
  "title": "プロジェクトA の設計書作成",
  "description": "システム全体のアーキテクチャを定義する",
  "status": "todo",
  "category_id": "cat-001",
  "parent_id": null,
  "order_num": 1,
  "progress": 0,
  "is_today": 0,
  "scheduled_at": "2026-07-30T09:00:00Z",
  "due_date": "2026-08-05T18:00:00Z",
  "created_at": "2026-07-29T12:00:00Z",
  "updated_at": "2026-07-29T14:00:00Z",
  "completed_at": null
}
```

### 5. 親と子孫をまとめて「今日やる」に設定 `POST /api/v1/tasks/:id/set_today`

**リクエスト:**
```json
{
  "is_today": 1
}
```

**レスポンス (200 OK):**
```json
{
  "message": "Successfully updated task and all descendants to is_today=1",
  "updated_count": 3,
  "tasks": [
    {
      "id": "task-abc123",
      "title": "プロジェクトA の設計書作成",
      "is_today": 1,
      "updated_at": "2026-07-29T14:05:00Z"
    },
    {
      "id": "task-def456",
      "title": "API 設計書 作成",
      "is_today": 1,
      "updated_at": "2026-07-29T14:05:00Z"
    },
    {
      "id": "task-ghi789",
      "title": "データベース スキーマ設計",
      "is_today": 1,
      "updated_at": "2026-07-29T14:05:00Z"
    }
  ]
}
```

### 6. 親と子孫をまとめて完了 `POST /api/v1/tasks/:id/set_complete`

**リクエスト:**
```json
{}
```

**レスポンス (200 OK):**
```json
{
  "message": "Successfully marked task and all descendants as done",
  "updated_count": 2,
  "tasks": [
    {
      "id": "task-abc123",
      "title": "プロジェクトA の設計書作成",
      "status": "done",
      "progress": 100,
      "completed_at": "2026-07-29T14:10:00Z",
      "updated_at": "2026-07-29T14:10:00Z"
    },
    {
      "id": "task-def456",
      "title": "API 設計書 作成",
      "status": "done",
      "progress": 100,
      "completed_at": "2026-07-29T14:10:00Z",
      "updated_at": "2026-07-29T14:10:00Z"
    }
  ]
}
```

### 7. 並び替え更新 `POST /api/v1/tasks/reorder`

**リクエスト:**
```json
{
  "orderUpdates": [
    {
      "id": "task-abc123",
      "order_num": 3
    },
    {
      "id": "task-def456",
      "order_num": 1
    },
    {
      "id": "task-ghi789",
      "order_num": 2
    }
  ]
}
```

**レスポンス (200 OK):**
```json
{
  "message": "Successfully reordered tasks",
  "updated_count": 3,
  "tasks": [
    {
      "id": "task-def456",
      "order_num": 1
    },
    {
      "id": "task-ghi789",
      "order_num": 2
    },
    {
      "id": "task-abc123",
      "order_num": 3
    }
  ]
}
```

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
  - `scheduled_at` TEXT NULL — 実行予定日時（ISO 日時）
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
  - 各タスク行: タイトル、カテゴリバッジ、実行予定日時（大きめ表示）、期限、進捗バー、操作ボタン（▲/▼、子タスク新規、編集、完了、削除）
  - 子タスク: 親の下に入れ子で表示。子タスクには個別の「今日やる」ボタンは表示しない（親で一括設定）

- タスクモーダル (`TaskModal.tsx`)
  - 用途: 新規作成 / 編集
  - 入力項目: タイトル（必須）、実行予定日時（必須・datetime）、期限日時（必須・datetime）、説明（必須）、カテゴリ（必須）、親タスク（新規子作成時は親で固定）

---

## 運用上の留意点
- `is_today` フラグを親子で一貫して扱う（子作成時に親の `is_today` を継承、親の一括更新は atomic に行う）
- 並び替えは階層内の `order_num` を更新してサーバへ一括送信する設計
- 期限切れの強調表示と完了済みの表示（背景色・ボタン非表示）を UX として実装済み

作成日: 2026-06-25
