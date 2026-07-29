# TODO AIAD Next.js Scaffold

Next.js App Router、TypeScript、Tailwind CSS、Prisma、SQLiteで作成したTODOアプリの最小構成です。

トップページでは、Prismaから取得したTODO一覧を表示し、登録・編集モーダルからTODOを作成・更新できます。削除ボタンから論理削除も実行できます。

## 技術構成

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Prisma
- SQLite
- dnd kit

## セットアップ

`.env` はリポジトリ管理しません。最初に `.env.example` からコピーしてください。

```bash
cp .env.example .env
npm install
npm run prisma:migrate -- --name init
npm run dev
```

ブラウザで `http://localhost:3000` を開いてください。

## 任意：初期データ投入

```bash
npm run db:seed
```

seedには以下の確認用データを含めています。

- 今日やるタスク
- 期限切れ未完了タスク
- 未来期限のタスク
- 親タスクと子タスク
- 進捗バー確認用の完了済み子タスク
- 学習カテゴリ
- 仕事カテゴリ

## 動作確認用API

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/tasks
curl http://localhost:3000/api/tasks/<taskId>
```

TODOを作成する例：

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"サンプルTODO","nextAction":"最初の1行を書く","priority":"high","dueDate":"2026-06-30","estimateMinutes":15}'
```

`/api/tasks` を利用する前に、Prisma migrationを実行してください。

## ディレクトリ構成

```text
app/
  api/
    categories/route.ts
    health/route.ts
    tasks/route.ts
    tasks/[id]/route.ts
    tasks/[id]/work/route.ts
    tasks/[id]/complete/route.ts
    tasks/reorder/route.ts
  globals.css
  layout.tsx
  page.tsx
  task-list-client.tsx
lib/
  date.ts
  prisma.ts
  reorder.ts
  task-input.ts
  task-query.ts
  task-view.ts
prisma/
  schema.prisma
  seed.ts
```

## 実装メモ

### .envの扱い

- `.env` は `.gitignore` に追加済みです。
- `.env.example` のみをリポジトリ管理する想定です。

### 依存バージョン

`latest` 指定は避け、`package.json` では直接依存を固定しています。

この生成環境ではnpm registryへアクセスできず `npm install` / `npm list --depth=0` を実行できなかったため、`package-lock.json` は未生成です。初回セットアップ時に生成される `package-lock.json` は、再現性確保のためリポジトリにコミットしてください。

### priority sortについて

SQLite + Prismaではenumが文字列として保存されるため、単純な `ORDER BY priority` は「高→中→低」になりません。

`sort=priority` 実装時は、以下のような優先度順をアプリ側で明示してください。

```ts
const priorityOrder = { high: 1, medium: 2, low: 3 } as const;
```

Prismaの単純な `orderBy` ではなく、アプリ側配列ソート、または `CASE WHEN priority='high' THEN 1 WHEN priority='medium' THEN 2 ELSE 3 END` 相当のSQLで対応する想定です。

### sortOrderについて

スキーマ上のデフォルト値は `0` ですが、POST APIでは同一親配下の `max(sortOrder) + 10` を設定します。

### APIエラーレスポンス

TODO APIでは、以下の統一形式でエラーを返します。

```json
{
  "error": "VALIDATION_ERROR",
  "message": "タイトルは必須です。"
}
```

### Prismaログ

開発環境ではPrismaの `query`, `warn`, `error` ログを出力します。
本番環境では `warn`, `error` のみにしています。


### TODO一覧画面

`app/page.tsx` では、以下を表示します。

- タイトル
- カテゴリ
- 期限
- 優先度
- 見積時間
- 進捗バー
- 完了チェック
- 着手ボタン
- 編集ボタン
- 削除ボタン

登録・編集モーダルを実装済みです。TODO追加ボタンで新規登録、各行の編集ボタンで既存TODOを更新できます。削除ボタンは `DELETE /api/tasks/:id` に接続済みで、論理削除後に一覧を再取得します。着手ボタンは `PATCH /api/tasks/:id/work` に接続済みです。完了チェックは `PATCH /api/tasks/:id/complete` に接続済みで、完了・完了取り消しを画面から実行できます。

フォームでは以下を入力できます。

- タイトル（必須）
- 説明
- 親タスク
- カテゴリ
- 期限日
- 優先度
- 今日やるフラグ
- 見積時間
- 次にやる具体的な行動（必須）

### POST /api/tasks の入力検証

以下の検証を実装済みです。

- 不正なJSONは `VALIDATION_ERROR` の400レスポンスを返す
- `title` は必須
- `nextAction` は必須
- `priority` は `low`, `medium`, `high` のみ許可
- `dueDate` は `YYYY-MM-DD` 形式のみ許可
- `estimateMinutes` は、未指定または `null` は許可し、値がある場合は0以上の整数のみ許可
- `parentId` は存在し、論理削除されておらず、トップレベルタスクである場合のみ許可
- `categoryId` は存在し、論理削除されていない場合のみ許可

## 補足

- SQLiteのDBファイルは `prisma/dev.db` に作成されます。
- MVPの詳細機能は今後のステップで追加します。




### CRUD API

TODO向けに以下のCRUD APIを実装しています。

| メソッド | パス | 内容 |
|---|---|---|
| GET | `/api/tasks` | 論理削除されていないTODO一覧を取得 |
| POST | `/api/tasks` | TODOを作成 |
| GET | `/api/tasks/:id` | 論理削除されていないTODO詳細を取得 |
| PATCH | `/api/tasks/:id` | TODOを更新 |
| DELETE | `/api/tasks/:id` | TODOを論理削除 |

`GET /api/tasks` と `GET /api/tasks/:id` は、`deletedAt = null` のタスクのみを返します。

`DELETE /api/tasks/:id` は物理削除せず、対象タスクの `deletedAt` に現在日時を設定します。未削除の子タスクを持つ親タスクを削除する場合、通常のDELETEでは `CHILD_TASK_EXISTS` の409レスポンスを返します。確認後に子タスクも含めて削除する場合は、`DELETE /api/tasks/:id?cascade=true` を使用します。

```bash
curl -X DELETE http://localhost:3000/api/tasks/<taskId>
curl -X DELETE 'http://localhost:3000/api/tasks/<parentTaskId>?cascade=true'
```

`PATCH /api/tasks/:id` のレスポンスは、更新対象が親タスクの場合でも子タスクを含めて進捗率を再計算したTaskViewを返します。現時点の画面は保存後に `GET /api/tasks` を再取得するため、APIレスポンス差し込みによる不整合は避けています。

### モーダルUI

登録・編集モーダルは以下に対応しています。

- バックドロップクリックで閉じる
- ESCキーで閉じる
- `role="dialog"` / `aria-modal="true"` / `aria-labelledby` を付与
- モーダル表示時にタイトル入力へフォーカス
- 送信中の二重送信ガード

カテゴリ一覧はモーダルを開くタイミングで `/api/categories` を再取得します。Step5でカテゴリ管理UIを追加した場合も、モーダル選択肢が古くなりにくい構成にしています。

### 登録・編集API

- `POST /api/tasks` でTODOを作成します。
- `PATCH /api/tasks/:id` でTODOを更新します。
- どちらも `title` と `nextAction` を必須にしています。
- 保存後の画面更新は、APIレスポンスを直接差し込まず `GET /api/tasks` を再取得する方針です。これにより、GETのTaskView型と画面表示を常に揃えます。

### buildTaskViews の進捗計算

`buildTaskViews(displayTasks, now, progressSourceTasks)` の形にし、表示対象タスクと進捗計算用タスクを分けられるようにしています。

今日フィルタや検索では、表示対象タスクを `displayTasks`、未削除タスク全体を `progressSourceTasks` として渡しています。これにより、親タスクだけが条件に一致して子タスクが非表示になる場合でも、親タスクの進捗率は非表示の子タスクも含めた未削除子タスク全体から算出されます。

### 階層構築ヘルパー

`childrenByParentId` のMap構築は `lib/task-view.ts` の `buildChildrenByParentId` に寄せています。

一覧画面側の階層構築も `buildTaskHierarchy` を使うため、フィルタ実装時にMap構築ロジックが分散しないようにしています。

### 親タスク削除時の挙動

親タスクに未削除の子タスクがある場合、通常の `DELETE /api/tasks/:id` は削除せず、以下の409レスポンスを返します。

```json
{
  "error": "CHILD_TASK_EXISTS",
  "message": "子タスクが存在するため、削除には確認が必要です。"
}
```

確認後に `DELETE /api/tasks/:id?cascade=true` を呼び出した場合のみ、親タスクと未削除の子タスクをまとめて論理削除します。画面上では、親タスクのカスケード削除中に配下の子タスク行も「削除中...」表示になります。

モーダルの `onClose` は `useCallback` でメモ化し、ESCキーリスナーの再登録が不要に増えないようにしています。

### カテゴリCRUD API

カテゴリ向けに以下のAPIを実装しています。

| メソッド | パス | 内容 |
|---|---|---|
| GET | `/api/categories` | 論理削除されていないカテゴリ一覧を取得 |
| POST | `/api/categories` | カテゴリを作成 |
| PATCH | `/api/categories/:id` | カテゴリを更新 |
| DELETE | `/api/categories/:id` | カテゴリを論理削除 |

`GET /api/categories` は `deletedAt = null` のカテゴリのみを、`sortOrder` 昇順で返します。

`POST /api/categories` はカテゴリ名と表示色を受け取り、`sortOrder` は既存カテゴリの最大値 + 10 で採番します。

```bash
curl -X POST http://localhost:3000/api/categories \
  -H 'Content-Type: application/json' \
  -d '{"name":"家事","color":"#f97316"}'
```

`PATCH /api/categories/:id` はカテゴリ名と表示色を更新します。

```bash
curl -X PATCH http://localhost:3000/api/categories/<categoryId> \
  -H 'Content-Type: application/json' \
  -d '{"name":"仕事","color":"#34d399"}'
```

`DELETE /api/categories/:id` は物理削除せず、カテゴリの `deletedAt` に現在日時を設定します。さらに、そのカテゴリを参照している未削除TODOの `categoryId` を `null` に更新します。これにより、該当TODOは一覧上で「カテゴリなし」として表示されます。

```bash
curl -X DELETE http://localhost:3000/api/categories/<categoryId>
```

カテゴリ入力のバリデーションは以下です。

- `name` は必須、50文字以内
- `color` は任意
- `color` を指定する場合は `#RRGGBB` 形式
- 不正なJSONは400
- 存在しない、または論理削除済みカテゴリへの更新・削除は404

### カテゴリ管理UI

TODO一覧画面にカテゴリ管理パネルを追加しています。

- カテゴリの作成
- カテゴリの更新
- カテゴリの削除
- カテゴリ一覧表示

カテゴリを削除した場合は、カテゴリ一覧とTODO一覧を再取得し、参照中TODOのカテゴリ表示を「カテゴリなし」に更新します。

### 今日やるTODOフィルタ

`GET /api/tasks?filter=today` を実装しています。

今日判定はクライアントのタイムゾーンではなく、サーバ側で `Asia/Tokyo` 基準の日付を使います。

今日フィルタの対象は以下です。

- `isToday = true`
- `dueDate` が `Asia/Tokyo` 基準の今日
- 期限切れかつ未完了

レスポンスには `tasks` と `meta` を返します。

```bash
curl 'http://localhost:3000/api/tasks?filter=today'
```

`meta.totalEstimateMinutes` は、未完了かつ `contextOnly = false` のタスクだけを合算します。子タスクだけが今日対象で、親タスクが階層表示のために `contextOnly = true` として含まれる場合、その親タスクの見積時間は合計に含めません。

画面では「表示フィルタ」の「今日」ボタンから今日やるTODOだけを確認できます。

### 今日フィルタの親子表示

- 子タスクだけが今日条件に一致する場合、親タスクは `contextOnly = true` として関連表示します。
- 親タスクだけが今日条件に一致する場合、今日条件に一致しない子タスクは表示しません。
- 親タスクの進捗率は、表示されていない子タスクも含めた未削除子タスク全体から計算します。

seedには、上記2パターンを確認できるサンプルタスクを含めています。

### カテゴリUIの補足

カテゴリ色は「色を設定する」チェックボックスを外すことで `null` にできます。カテゴリカードでは開発用の `sortOrder` 表示をやめ、色コードまたは「色なし」を表示します。


### 階層表示と contextOnly

TODO一覧は親タスク・子タスクの2階層で表示します。

`GET /api/tasks` では、条件に直接一致したタスクに加えて、条件に一致した子タスクの親タスクも返します。親タスクが条件に直接一致していない場合は `contextOnly = true` とし、画面上では「関連する親タスク」として薄いカード表示にします。

- 子タスクだけが今日条件・検索条件・カテゴリ条件に一致する場合、親タスクは `contextOnly = true` として同梱します。
- 親タスクだけが今日条件・検索条件・カテゴリ条件に一致する場合、条件に一致しない子タスクは表示しません。
- 親タスクと子タスクの両方が条件に一致する場合、両方を通常表示します。
- `contextOnly = true` のタスクは `meta.totalEstimateMinutes` の集計対象外です。

### タスク検索

`GET /api/tasks` は `q` クエリパラメータを受け取ります。

```bash
curl 'http://localhost:3000/api/tasks?q=英語'
curl 'http://localhost:3000/api/tasks?filter=today&q=英語'
```

検索対象は以下です。

- タイトル
- 説明
- 次にやる具体的な行動
- カテゴリ名

画面では「タスク検索」から検索できます。フィルタ切り替えや検索取得が失敗した場合、選択中のフィルタや適用済み検索語は直前の状態に戻します。

### カテゴリフィルタ

`GET /api/tasks` は `categoryId` クエリパラメータによるカテゴリ絞り込みに対応しています。

```bash
curl 'http://localhost:3000/api/tasks?categoryId=<categoryId>'
curl 'http://localhost:3000/api/tasks?filter=today&categoryId=<categoryId>'
curl 'http://localhost:3000/api/tasks?q=英語&categoryId=<categoryId>'
```

カテゴリフィルタは今日フィルタ・検索と同時に利用できます。子タスクだけが指定カテゴリに一致した場合は、階層表示を維持するため親タスクを `contextOnly: true` として同梱します。`meta.categoryId` には適用中のカテゴリIDが返ります。

画面では「カテゴリで絞り込み」セレクトからカテゴリごとのTODO表示に切り替えられます。選択中のカテゴリを削除した場合は、カテゴリフィルタを解除してTODO一覧を再取得します。

### 進捗バー

TODO一覧の各行に進捗バーを表示します。

- 未削除の子タスクがある場合: `Math.round(完了済み子タスク数 / 子タスク総数 * 100)` で整数化します。
- 子タスクがない場合: 完了済みなら `100%`、未完了なら `0%` を表示します。
- 今日フィルタや検索で子タスクが非表示になっている場合でも、親タスクの進捗率は未削除の子タスク全体をもとに計算します。
- 画面上の進捗バーには `role="progressbar"` と `aria-valuenow` を付与しています。

`getTaskDateState` は、タスクごとに今日の日付を再計算しないよう、呼び出し元で1回だけ算出した `today` を受け取る形にしています。

### タスク検索機能

`GET /api/tasks` は `q` クエリパラメータによる検索に対応しています。

検索対象は以下です。

- タイトル
- 説明
- 次にやる具体的な行動（`nextAction`）
- カテゴリ名

```bash
curl 'http://localhost:3000/api/tasks?q=英語'
curl 'http://localhost:3000/api/tasks?filter=today&q=英語'
```

検索条件に子タスクだけが一致した場合は、階層を維持するために親タスクも `contextOnly: true` としてレスポンスに含めます。画面では「関連する親タスク」として表示します。

親タスクだけが検索条件に一致した場合、条件に一致しない子タスクは表示しません。ただし、親タスクの進捗率は非表示の子タスクも含めた未削除子タスク全体から算出します。

検索フォームは一覧画面上部に配置しています。検索実行後は `meta.q` に適用中の検索語、`meta.directMatchedCount` に直接一致件数、`meta.contextOnlyCount` に関連表示の親タスク件数が返ります。

### アクセシビリティ補足

進捗バーの `aria-label` は `role="progressbar"` を持つ要素自身に付与しています。


### ドラッグ並べ替え

TODO一覧では dnd kit を使ってタスクをドラッグ並べ替えできます。

- トップレベルタスクはトップレベルタスク同士で並べ替えます。
- 子タスクは同じ親タスク配下の子タスク同士で並べ替えます。
- ドラッグによる親子関係の変更は行いません。
- `contextOnly = true` の関連表示タスクは並べ替え対象外です。
- 並べ替え中は編集・削除・新規追加操作を一時的に無効化します。

並べ替えAPIは以下です。

```bash
curl -X PATCH http://localhost:3000/api/tasks/reorder \
  -H 'Content-Type: application/json' \
  -d '{"parentId":null,"orderedTaskIds":["task_3","task_1","task_5"]}'
```

リクエスト項目は以下です。

- `parentId`: 並べ替え対象の親タスクID。トップレベルの場合は `null`。
- `orderedTaskIds`: 現在表示中の同一親配下タスクIDを、並べ替え後の順序で指定します。

フィルタ中の並べ替えでは、`orderedTaskIds` に含まれる表示中タスクが元々存在していたスロットに新しい順序を差し込みます。`orderedTaskIds` に含まれない非表示タスクは、元の位置と相対順を維持します。

例：全体順序が `task_1, task_2, task_3, task_4, task_5` で、表示中タスクが `task_1, task_3, task_5` の場合、`orderedTaskIds` に `task_3, task_1, task_5` を渡すと、更新後の全体順序は `task_3, task_2, task_1, task_4, task_5` になります。

レスポンスでは、同一親配下の未削除タスクを更新後の全体順序で返します。

```json
{
  "parentId": null,
  "reorderedTaskIds": ["task_3", "task_1", "task_5"],
  "tasks": [
    { "id": "task_3", "sortOrder": 10 },
    { "id": "task_2", "sortOrder": 20 },
    { "id": "task_1", "sortOrder": 30 },
    { "id": "task_4", "sortOrder": 40 },
    { "id": "task_5", "sortOrder": 50 }
  ]
}
```

`@dnd-kit/core` は `6.3.1`、`@dnd-kit/sortable` は `10.0.0`、`@dnd-kit/utilities` は `3.2.2` に固定しています。

### 行動化チェック / 未着手リスク

タスク登録時の `nextAction` は必須です。未完了・作成から24時間以上経過・進捗0%・`lastWorkedAt = null` のタスクは、一覧で「未着手リスク」として表示されます。

着手・作業した操作は以下のAPIで実行します。

| メソッド | パス | 内容 |
|---|---|---|
| PATCH | `/api/tasks/:id/work` | `startedAt` と `lastWorkedAt` を更新 |

`PATCH /api/tasks/:id/work` の仕様:

- 対象タスクの `startedAt` が未設定なら現在日時を設定します。
- 対象タスクの `lastWorkedAt` を現在日時に更新します。
- 子タスクに対して実行した場合、親タスクの `startedAt` / `lastWorkedAt` も更新します。
- 更新後、画面は `GET /api/tasks` を再取得して未着手リスク表示を更新します。

確認例:

```bash
curl -X PATCH http://localhost:3000/api/tasks/<taskId>/work
```

seedには「未着手リスクサンプル」を含めています。`npm run db:seed` 後、一覧で未着手リスク表示を確認できます。着手ボタンを押すと `lastWorkedAt` が更新され、未着手リスク表示が外れます。


### 完了状態更新API

TODOの完了・完了取り消しは以下のAPIで実行します。

| メソッド | パス | 内容 |
|---|---|---|
| PATCH | `/api/tasks/:id/complete` | TODOの完了状態を更新 |

リクエストボディに `completed` を指定できます。省略した場合は現在状態からトグルします。

```bash
curl -X PATCH http://localhost:3000/api/tasks/<taskId>/complete \
  -H 'Content-Type: application/json' \
  -d '{"completed":true}'
```

完了時は以下を更新します。

- `status = done`
- `completedAt = 現在日時`
- `startedAt` が未設定なら現在日時
- `lastWorkedAt = 現在日時`

完了取り消し時は以下を更新します。

- `status = todo`
- `completedAt = null`
- `startedAt` と `lastWorkedAt` は維持

子タスクを完了にした場合は、親タスクの `startedAt` / `lastWorkedAt` も更新します。

### テスト

VitestとPlaywrightの主要テストを追加しています。

| 種別 | コマンド | 内容 |
|---|---|---|
| Unit / API | `npm run test` | 進捗計算、今日判定、Asia/Tokyo日付判定、期限切れ、未着手リスク、contextOnly、カテゴリフィルタ、合計見積時間、並び替えマージ、親タスク削除、カテゴリ削除、完了・完了取り消し、子タスク完了時の親タスク更新、並び替えAPIを検証 |
| E2E | `npm run test:e2e` | PlaywrightでTODO登録、必須/数値バリデーション、編集、削除、親子削除、完了/完了取り消し、未着手リスク解除、今日フィルタ、期限切れ、合計見積、階層表示、進捗バー、contextOnly表示、カテゴリ作成/更新/削除/絞り込み、タイトル/説明/nextAction/カテゴリ名検索、トップレベル/子タスク/フィルタ中のドラッグ並べ替え、論理削除後の非表示を検証 |

初回実行例:

```bash
cp .env.example .env
npm install

# Prisma Clientを生成します。npm run test内でも実行されますが、CIや初回セットアップでは明示実行しておくと安全です。
npm run prisma:generate

# Playwrightのブラウザをダウンロードします。初回、またはPlaywright更新後に必要です。
npm run test:e2e:install

npm run prisma:migrate -- --name init
npm run db:seed
npm run test
npm run test:e2e
```

Vitestはテスト用DBとして `DATABASE_URL=file:./test.db` を使用し、テスト実行前に `prisma db push --force-reset` でスキーマを反映します。通常の開発DB `dev.db` とは分けています。

Windows環境でもテストDB初期化が動くように、Vitestの `global-setup.ts` では `execSync("npx prisma db push --force-reset --skip-generate")` を使用しています。`shell: true` と配列引数の組み合わせによる Node.js の非推奨警告を避けています。

Playwrightは `npm install` だけではブラウザ本体が入らないため、E2E初回実行前に `npm run test:e2e:install` を実行してください。

Playwrightの `baseURL` と `webServer.url` は `http://localhost:3000` に統一しています。Next.js dev server のオリジン差異によるHMR警告を避けるため、`next.config.ts` には `allowedDevOrigins: ["127.0.0.1"]` も設定しています。CIではドラッグ操作の一時的な不安定さに備えて `retries: process.env.CI ? 2 : 0` を設定しています。

E2Eテストは `npm run dev` を自動起動し、`.env` の開発DBにテスト用TODOを作成します。タイトルやカテゴリ名は一意になるようにしていますが、CIで使う場合はE2E用DBや専用シードの利用を検討してください。未着手リスクのように `createdAt` の調整が必要な前提データは、Playwrightテスト内で `.env` を読み込み、Prismaから直接作成します。画面上のタスクカードとタイトルには `data-testid` を付与し、E2Eのロケータが見出しタグなどのDOM構造に依存しないようにしています。

この生成環境では `node_modules` がないため、`npm run test` / `npm run test:e2e` は未実行です。ローカルで `npm install` 後に実行してください。
