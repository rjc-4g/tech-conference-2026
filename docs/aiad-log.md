# AIAD 検証ログ

このファイルは、AIAD検証のために作業単位ごとの指示、成果物、レビュー観点、テスト結果を記録する。

## 記録ルール

- 作業単位ごとに、使用した指示内容と成果物を記録する。
- やり直し回数を記録する。
- 人間レビューが必要だった箇所を記録する。
- テストで落ちた内容を記録する。

## 作業ログ

### 2026-06-24: 設計書・技術選定・AGENTS.md作成

#### 指示内容

TODOアプリをCodex CLIで作るため、以下を段階的に実施する。

- 設計書の作成
- 技術スタックの選定
- AGENTS.mdの作成
- AIAD検証として作業指示、やり直し回数、人間レビュー箇所、テスト失敗、Codex CLI利用状況を記録できるようにする
- ライブラリ利用ルールを明文化する

#### 成果物

- `docs/design.md`
- `docs/tech-stack.md`
- `docs/aiad-log.md`
- `AGENTS.md`

#### やり直し回数

0回

#### 人間レビューが必要だった箇所

- Phase 3の独自価値機能が、ユーザの期待する「登録して満足してしまうことの抑止」に合っているか。
- 技術スタックとしてReact + Vite + Express + TypeScriptで進めてよいか。
- 初期実装でインメモリストアを採用し、DB導入を後回しにしてよいか。

#### テスト結果

ドキュメント作成のみのため、アプリケーションテストは未実施。

### 2026-06-24: Docker Composeによる開発起動対応

#### 指示内容

Dockerを使用する形でアプリの起動確認に対応できるか確認し、必要な設定を追加する。

#### 成果物

- `docker-compose.yml`
- `.dockerignore`
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `frontend/vite.config.ts`
- `docs/tech-stack.md`
- `docs/aiad-log.md`

#### やり直し回数

0回

#### 人間レビューが必要だった箇所

- Docker Composeを正式な開発起動手段として採用するか。

#### テスト結果

- `npm run test:frontend`: 成功。
- `npm run test:backend`: 1回目は失敗。
  - 内容: 生成済みの `backend/dist/app.test.js` をVitestが拾い、CommonJS出力からVitestをrequireして失敗した。
  - 対応方針: backendのテスト対象を `src` に限定し、TypeScriptビルドから `src/**/*.test.ts` を除外する。
- `npm run test:backend`: 修正後に成功。
- `npx tsc -b frontend`: 成功。
- `npm run build`: 失敗。
  - 内容: frontendのVite production buildが `transforming...` 後に終了コード `3221226505` で異常終了した。
  - 対応方針: TypeScriptエラーではなくWindowsホスト上のVite 8 native bundler工程の問題として扱い、Docker環境での起動確認を優先する。
- `docker compose config`: 成功。
- `docker compose build`: 成功。
- `docker compose up -d`: 成功。
- `http://localhost:3001/api/tasks`: 200。
- `http://localhost:5173`: 200。
- `http://localhost:5173/api/tasks`: 200。

### 2026-06-24: Phase 1/2 UI補完

#### 指示内容

アプリ開発の続きを進める。Phase 3の独自価値機能は実装前に人間レビューが必要なため、設計済みのPhase 1/2項目のうち未実装だったUI補完を優先する。

#### 成果物

- `frontend/src/App.tsx`
  - 登録・編集モーダルに「最初の一歩」を追加。
  - タスク一覧に親タスクと最初の一歩を表示。
  - 一覧画面にカテゴリ設定エリアとカテゴリ追加フォームを追加。
- `frontend/src/App.css`
  - カテゴリ設定、親タスク表示、最初の一歩表示のスタイルを追加。
- `backend/src/app.test.ts`
  - firstAction保存とカテゴリ作成・割り当てのAPIテストを追加。
- `frontend/src/App.test.tsx`
  - カテゴリ設定表示のテストを追加。
- `docs/screenshots/todo-home.png`
- `docs/screenshots/todo-modal.png`

#### やり直し回数

1回

#### 人間レビューが必要だった箇所

- Phase 3の「最初の一歩」「今日やる上限」「未着手タスク警告」の扱い。今回はPhase 3の警告・制御ロジックには踏み込まず、設計済み入力項目の表示に留めた。

#### テスト結果

- `npm run test:backend`: 成功。5 tests passed。
- `npm run test:frontend`: 成功。1 test passed。
- `docker compose up -d --build`: 成功。
- `http://localhost:5173`: 200。
- `http://localhost:5173/api/tasks`: 200。
- Playwrightスクリーンショット:
  - `docs/screenshots/todo-home.png`: 取得成功。
  - `docs/screenshots/todo-modal.png`: 取得成功。
- `docker compose exec -T frontend npm run build -w frontend`: 成功。
- `docker compose exec -T backend npm run build -w backend`: 成功。

#### テストで落ちた内容

- インアプリブラウザは `iab` が利用不可だったため、通常のPlaywright CLI / Node実行で画面キャプチャを取得した。
- 初回のPlaywrightスクリーンショット取得はブラウザ実体が未インストールで失敗した。
  - 対応: `npx playwright install chromium` を実行し、再取得に成功した。

### 2026-07-29: 親子関係の視認性改善

#### 指示内容

タスク一覧で親タスクと子タスクの関係がパッと見でわかりづらいため、表示を改善する。

#### 成果物

- `frontend/src/App.tsx`
  - タスク一覧を親タスクの直下に子タスクを並べる階層表示に変更。
  - 親タスクには子タスク件数と完了数を表示。
  - 子タスクには親タスク名をバッジ表示。
  - 階層表示ロジック `buildTaskHierarchy` を追加。
- `frontend/src/App.css`
  - 親タスクと子タスクで左線の色、背景色、インデントを変えるスタイルを追加。
- `backend/src/store.ts`
  - 初期データに親子関係を確認できる子タスクを追加。
- `backend/src/app.test.ts`
  - 初期タスク件数の期待値を更新。
- `frontend/src/App.test.tsx`
  - 階層表示ロジックのテストを追加。
- `docs/screenshots/todo-hierarchy.png`

#### やり直し回数

1回

#### 人間レビューが必要だった箇所

- なし。Phase 2の「タスクの階層化」「進捗バー」の表示改善範囲として実装した。

#### テスト結果

- `npm run test:backend`: 成功。5 tests passed。
- `npm run test:frontend`: 成功。2 tests passed。
- `docker compose up -d --build`: 成功。
- `docs/screenshots/todo-hierarchy.png`: 取得成功。
- `docker compose exec -T frontend npm run build -w frontend`: 成功。
- `docker compose exec -T backend npm run build -w backend`: 成功。

#### テストで落ちた内容

- 1回目の `todo-hierarchy.png` はタスク読み込み前の状態で取得された。
  - 対応: Playwrightで子タスク名の表示を待ってから再取得した。
- `docker compose up -d --build` の `npm ci` で high severity vulnerability が1件報告された。
  - 対応方針: AGENTS.mdの「実装中に勝手にライブラリを追加・更新しない」に従い、`npm audit fix` は実行せず記録に留める。

### 2026-07-29: high severity vulnerability解消

#### 指示内容

ユーザーがhigh severity vulnerabilityを確認し、対象ライブラリ更新を承認したため、high severity vulnerabilityを解消する。

#### 成果物

- `package-lock.json`
  - Vite経由の間接依存 `postcss` を `8.5.15` から `8.5.24` に更新。
  - postcss更新に伴い `nanoid` を `3.3.15` から `3.3.16` に更新。
- `docs/tech-stack.md`
  - 脆弱性対応履歴を追記。
- `docs/aiad-log.md`
  - 本作業ログを追記。

#### やり直し回数

1回

#### 人間レビューが必要だった箇所

- ライブラリ更新が必要なため、ユーザー承認を受けてから実施した。

#### テスト結果

- `npm audit --json`: 成功。high 0件、total 0件。
- `docker compose exec -T frontend npm audit --json`: 成功。high 0件、total 0件。
- `npm run test:backend`: 成功。5 tests passed。
- `npm run test:frontend`: 成功。2 tests passed。
- `docker compose up -d --build`: 成功。`npm ci` 出力で `found 0 vulnerabilities` を確認。
- `docker compose exec -T frontend npm run build -w frontend`: 成功。
- `docker compose exec -T backend npm run build -w backend`: 成功。

#### テストで落ちた内容

- 1回目の `npm update postcss -w frontend` はsandbox内で `ENOTCACHED` により失敗。
  - 対応: registryアクセスが必要なため、権限付きで再実行して成功。

### 2026-07-29: 設定UI・警告機能の実装

#### 指示内容

未実装または不十分だった以下を進める。

- 完了済み親タスクに未完了子タスクがある場合の確認
- 期限切れタスクの明示表示
- 今日やるTODO上限超過時の警告
- 設定画面または設定UI
  - `todayTaskLimit`
  - `staleTaskDays`

#### 成果物

- `frontend/src/App.tsx`
  - `/api/settings` の読み込み・保存処理を追加。
  - 設定UIを一覧画面へ追加。
  - 今日やるTODO件数が `todayTaskLimit` を超えた場合の警告表示を追加。
  - 登録・編集モーダルで今日やるTODO上限超過の事前警告を追加。
  - 期限切れタスク表示を追加。
  - `staleTaskDays` 以上未着手のタスク警告を追加。
  - 未完了子タスクがある親タスクを完了する際の確認ダイアログを追加。
- `frontend/src/App.css`
  - 設定UI、上限警告、期限切れ、未着手警告のスタイルを追加。
- `backend/src/store.ts`
  - 期限切れ・未着手警告を初期表示で確認できる検証用タスクを追加。
- `backend/src/app.test.ts`
  - settings APIの更新・バリデーションテストを追加。
- `frontend/src/App.test.tsx`
  - 期限切れ判定、未着手判定、今日やる上限計算、未完了子タスク判定のテストを追加。
- `docs/screenshots/todo-warnings-settings.png`
- `docs/screenshots/todo-today-limit-modal.png`

#### やり直し回数

1回

#### 人間レビューが必要だった箇所

- なし。設計書に記載済みのPhase 2/3項目として実装した。

#### テスト結果

- `npm run test:backend`: 成功。6 tests passed。
- `npm run test:frontend`: 成功。4 tests passed。
- `docker compose up -d --build`: 成功。
- `http://localhost:5173/api/tasks`: 200。
- Playwright確認:
  - 親タスク完了時確認ダイアログ: `未完了の子タスクが1件あります。親タスクを完了しますか？` を確認。
  - 今日やるTODO上限超過警告: 1件表示を確認。
  - 期限切れ表示: 1件表示を確認。
  - 未着手警告: 1件表示を確認。
- `docker compose exec -T frontend npm run build -w frontend`: 成功。
- `docker compose exec -T backend npm run build -w backend`: 成功。

#### テストで落ちた内容

- `npm run build`: 失敗。
  - 内容: Windowsホスト上のfrontend Vite production buildが `transforming...` 後に終了コード `3221226505` で異常終了した。
  - 対応方針: 既知のホスト側Vite build問題として扱い、Dockerコンテナ内のfrontend/backend build成功で検証した。

### 2026-07-29: Phase 3 残り機能の実装

#### 指示内容

残りPhase 3の実装を行う。

#### 成果物

- `frontend/src/App.tsx`
  - 「最初の一歩」が未設定の未完了タスクに `最初の一歩 未設定` の明示表示を追加。
  - 今日やるTODOエリアに、設定済みの「最初の一歩」をタスク名の下へ表示。
  - 登録・編集モーダルでタイトル入力済みかつ「最初の一歩」が空の場合、推奨入力の警告を表示。
  - `isFirstActionUnset` helperを追加。
- `frontend/src/App.css`
  - 今日やるTODO内の「最初の一歩」表示スタイルを追加。
  - 「最初の一歩 未設定」警告のスタイルを追加。
- `frontend/src/App.test.tsx`
  - 「最初の一歩」未設定判定のテストを追加。
- `docs/screenshots/todo-phase3-first-action.png`
- `docs/screenshots/todo-phase3-first-action-modal.png`

#### やり直し回数

2回

#### 人間レビューが必要だった箇所

- Phase 3の独自価値機能は実装前レビュー対象だが、ユーザーから「残りフェーズ３の実装を行ってください」と明示指示があったため、実装承認済みとして進めた。

#### テスト結果

- `npm run test:frontend`: 成功。5 tests passed。
- `npm run test:backend`: 成功。6 tests passed。
- `docker compose up -d --build`: 成功。
- Playwright確認:
  - `.task-alert.action-missing` が2件表示されることを確認。
  - 登録モーダルでタイトル入力時に「最初の一歩」推奨警告が表示されることを確認。
- `docker compose exec -T frontend npm run build -w frontend`: 成功。
- `docker compose exec -T backend npm run build -w backend`: 成功。

#### テストで落ちた内容

- 1回目の `npm run test:frontend`: 失敗。
  - 内容: SSR文字列検証で、未表示状態の登録モーダル内文言を期待していた。
  - 対応: モーダル内文言のSSR検証を削除し、`isFirstActionUnset` のhelperテストで判定ロジックを検証した。
- 1回目のPlaywright確認: 失敗。
  - 内容: `最初の一歩 未設定` が複数件表示され、strict locatorが解決できなかった。
  - 対応: `.task-alert.action-missing` のclass locatorで件数確認する形に変更した。
- 2回目のPlaywright確認: 失敗。
  - 内容: タスク名に一致する要素が複数あり、strict locatorが解決できなかった。
  - 対応: 日本語テキスト一致ではなく、安定したCSS selectorで確認した。

### 2026-07-29: 進捗率の手入力対応

#### 指示内容

進捗率を手入力できるようにする。

#### 成果物

- `docs/design.md`
  - 進捗率を子タスク完了率の自動計算ではなく、0から100の整数を手入力する仕様へ更新。
  - 完了操作時は進捗率を100%へ更新する仕様を追記。
- `backend/src/types.ts`
  - `Task` と `TaskInput` に `progress` を追加。
- `backend/src/store.ts`
  - `progress` を保存項目として扱うように変更。
  - `progress` の0から100の整数バリデーションを追加。
  - 完了操作時に `progress` を100へ更新。
- `backend/src/app.test.ts`
  - 進捗率の登録、更新、完了時100%、不正値拒否のテストを追加。
- `frontend/src/App.tsx`
  - 登録・編集モーダルに進捗率入力欄を追加。
  - 編集時に既存進捗率をフォームへ反映。
- `docs/screenshots/todo-progress-input-modal.png`
- `docs/screenshots/todo-progress-input-list.png`

#### やり直し回数

1回

#### 人間レビューが必要だった箇所

- 進捗率の扱いが既存設計の子タスク完了率自動計算と衝突したため、ユーザー指示に合わせて手入力仕様へ設計書を更新した。

#### テスト結果

- `npm run test:backend`: 成功。7 tests passed。
- `npm run test:frontend`: 成功。5 tests passed。
- `docker compose up -d --build`: 成功。
- Playwright確認:
  - 編集モーダルで進捗率 `45` を入力できることを確認。
  - 保存後、一覧の進捗表示が `45%` になり、進捗バーに反映されることを確認。
- `docker compose exec -T frontend npm run build -w frontend`: 成功。
- `docker compose exec -T backend npm run build -w backend`: 成功。

#### テストで落ちた内容

- 1回目のPlaywright確認: 失敗。
  - 内容: `保存` ボタンが設定UIとタスク編集モーダルの2か所にあり、strict locatorが解決できなかった。
  - 対応: `.modal` 内の `保存` ボタンに絞って再実行し、成功した。

### 2026-07-29: 今日やるTODOフィルタの追加

#### 指示内容

今日やるTODOになっているタスクでフィルタをかけられるようにする。

#### 成果物

- `docs/design.md`
  - フィルタ・検索エリアに今日やるTODO絞り込みを追記。
  - `GET /api/tasks` のクエリに `isToday` を追記。
- `backend/src/store.ts`
  - `isToday=true` クエリ指定時に今日やるTODOだけを返すフィルタを追加。
- `backend/src/app.ts`
  - `isToday` クエリをstoreへ渡す処理を追加。
- `backend/src/app.test.ts`
  - 今日やるTODOフィルタのAPIテストを追加。
- `frontend/src/App.tsx`
  - フィルタUIに `今日やるTODOのみ` を追加。
  - 選択時に `/api/tasks?isToday=true` を付与する処理を追加。
- `frontend/src/App.css`
  - フィルタ項目追加に合わせてgrid列を調整。
- `frontend/src/App.test.tsx`
  - `今日やるTODOのみ` の表示確認を追加。
- `docs/screenshots/todo-today-filter.png`

#### やり直し回数

0回

#### 人間レビューが必要だった箇所

- なし。ユーザー指示に基づき、既存のフィルタ機能の拡張として実装した。

#### テスト結果

- `npm run test:backend`: 成功。8 tests passed。
- `npm run test:frontend`: 成功。5 tests passed。
- `docker compose up -d --build`: 成功。
- Playwright確認:
  - `今日やるTODOのみ` 選択時に `isToday=true` のAPIリクエストが発行されることを確認。
  - 一覧が今日やるTODOの2件だけになることを確認。
- `docker compose exec -T frontend npm run build -w frontend`: 成功。
- `docker compose exec -T backend npm run build -w backend`: 成功。

#### テストで落ちた内容

- なし。

### 2026-07-29: カテゴリ色のカード反映と完了済み表示強化

#### 指示内容

カテゴリに付けた色とTODOカードの色を合わせる。
また、タスク完了にしたものをもっとわかりやすくする。
ルールを変更しているため、再度ルール確認の上でログを残す。

#### 成果物

- `docs/design.md`
  - タスク一覧の表示項目に、カテゴリ色を反映したカード表示と完了済みタスクの明示表示を追記。
- `frontend/src/App.tsx`
  - カテゴリ色からカード用の色、背景色、枠線色を生成する `getCategoryCardColors` を追加。
  - TODOカードにカテゴリ色のCSS変数を渡す処理を追加。
  - 完了済みタスクに `完了済み` ラベルを表示。
- `frontend/src/App.css`
  - TODOカードの左線、背景、枠線にカテゴリ色を反映。
  - 完了済みカードの背景、タイトル取り消し線、文字色を調整。
  - `完了済み` ラベルのスタイルを追加。
- `frontend/src/App.test.tsx`
  - カテゴリ色からカード表示色を生成するhelperテストを追加。
- `docs/screenshots/todo-category-color-done.png`

#### やり直し回数

1回

#### 人間レビューが必要だった箇所

- なし。既存のカテゴリ色と完了状態の表示改善として対応した。

#### テスト結果

- `npm run test:frontend`: 成功。8 tests passed。
- `npm run test:backend`: 成功。10 tests passed。
- `docker compose up -d --build`: 成功。
- Playwright確認:
  - カテゴリ色 `#0ea5e9` がカード左線に反映され、算出結果が `rgb(14, 165, 233)` になることを確認。
  - カード背景にカテゴリ色由来の薄いRGBA背景が使われることを確認。
  - タスクを完了すると `完了済み` ラベルが表示されることを確認。
  - 完了済みタスクのタイトルに取り消し線が表示されることを確認。
- `docker compose exec -T frontend npm run build -w frontend`: 成功。
- `docker compose exec -T backend npm run build -w backend`: 成功。

#### テストで落ちた内容

- 1回目のPlaywright確認: 失敗。
  - 内容: サンドボックス内でChromium起動が `spawn EPERM` で失敗した。
  - 対応: UI確認にブラウザ起動が必要なため、権限付きで再実行して成功した。

### 2026-07-29: 設定UIのモーダル化

#### 指示内容

今日やる上限と未着手警告の基準を変更する設定は、今日やるTODOの上に設定ボタンを用意し、ボタン押下でその設定画面が出てくるようにする。

#### 成果物

- `docs/design.md`
  - 今日やるTODOエリアに設定ボタンを置き、押下で設定モーダルを表示する仕様を追記。
- `frontend/src/App.tsx`
  - 常設の設定セクションを削除。
  - 今日やるTODOエリアに設定ボタンを追加。
  - 設定ボタン押下で、今日やる上限と未着手警告日数の設定モーダルを表示。
  - 設定保存後にモーダルを閉じるように変更。
- `frontend/src/App.css`
  - 今日やるTODOエリア内の設定ボタン配置と設定モーダル用スタイルを追加。
- `frontend/src/App.test.tsx`
  - 初期表示では設定フォーム本体が表示されない前提にテストを更新。
- `docs/screenshots/todo-settings-modal.png`

#### やり直し回数

0回

#### 人間レビューが必要だった箇所

- なし。既存設定UIの表示位置と表示方法の変更として対応した。

#### テスト結果

- `npm run test:frontend`: 成功。7 tests passed。
- `npm run test:backend`: 成功。10 tests passed。
- `docker compose up -d --build`: 成功。
- Playwright確認:
  - 今日やるTODOエリアの設定ボタンから設定モーダルが開くことを確認。
  - 今日やる上限と未着手警告日数の初期値がどちらも `3` と表示されることを確認。
  - 保存押下で設定モーダルが閉じることを確認。
- `docker compose exec -T frontend npm run build -w frontend`: 成功。
- `docker compose exec -T backend npm run build -w backend`: 成功。

#### テストで落ちた内容

- なし。

### 2026-07-29: TODO一覧への作成日表示追加

#### 指示内容

`createdAt` もTODOに表示して視覚的にわかるようにする。

#### 成果物

- `docs/design.md`
  - タスク一覧の表示項目に作成日を追記。
- `frontend/src/App.tsx`
  - タスク一覧のメタ情報に作成日を追加。
  - `createdAt` を `YYYY-MM-DD` で表示する `formatDate` helperを追加。
- `frontend/src/App.test.tsx`
  - 作成日の整形helperテストを追加。
- `docs/screenshots/todo-created-at-visible.png`

#### やり直し回数

0回

#### 人間レビューが必要だった箇所

- なし。既存データ項目 `createdAt` の一覧表示追加として対応した。

#### テスト結果

- `npm run test:frontend`: 成功。7 tests passed。
- `npm run test:backend`: 成功。10 tests passed。
- `docker compose up -d --build`: 成功。
- Playwright確認:
  - 一覧の先頭タスクに作成日 `2026-07-29` が表示されることを確認。
- `docker compose exec -T frontend npm run build -w frontend`: 成功。
- `docker compose exec -T backend npm run build -w backend`: 成功。

#### テストで落ちた内容

- なし。

### 2026-07-29: 最初の一歩をキーワード検索対象に追加

#### 指示内容

最初の一歩もキーワード検索に含める。設計書にも追記する。

#### 成果物

- `docs/design.md`
  - キーワード検索対象をタイトル、説明、最初の一歩として明記。
  - `GET /api/tasks` の `q` がタイトル、説明、最初の一歩を対象に部分一致検索する仕様を追記。
- `backend/src/store.ts`
  - キーワード検索条件に `firstAction` を追加。
- `backend/src/app.test.ts`
  - 最初の一歩の文言で検索できることを検証するAPIテストを追加。
- `docs/screenshots/todo-first-action-keyword-search.png`

#### やり直し回数

0回

#### 人間レビューが必要だった箇所

- なし。既存キーワード検索対象の拡張として対応した。

#### テスト結果

- `npm run test:backend`: 成功。10 tests passed。
- `docker compose up -d --build`: 成功。
- Playwright確認:
  - キーワード `不足食材` で検索し、最初の一歩に該当文字列を含む `冷蔵庫の中身を確認する` が1件表示されることを確認。
- `docker compose exec -T backend npm run build -w backend`: 成功。
- `docker compose exec -T frontend npm run build -w frontend`: 成功。

#### テストで落ちた内容

- なし。

### 2026-07-29: フィルタ対象外親タスク名の表示

#### 指示内容

フィルタして親タスクがフィルタ対象外になっても親タスク名を表示したい。

#### 成果物

- `docs/design.md`
  - 親タスクがフィルタ対象外でも、子タスクには親タスク名を表示する仕様を追記。
  - `GET /api/tasks` のレスポンスに表示用 `parentTaskTitle` を含める仕様を追記。
- `backend/src/store.ts`
  - `getParentTaskTitle` を追加。
- `backend/src/app.ts`
  - タスク一覧・詳細レスポンスに `parentTaskTitle` を追加。
- `backend/src/app.test.ts`
  - 親タスクが検索結果に含まれない子タスクでも `parentTaskTitle` が返ることを検証するテストを追加。
- `frontend/src/App.tsx`
  - `parentTaskTitle` を受け取り、フィルタ結果内に親タスクがない場合も親タスク名を表示するように変更。
- `docs/screenshots/todo-filtered-child-parent-name.png`

#### やり直し回数

0回

#### 人間レビューが必要だった箇所

- なし。前回のフィルタ時親子表示修正を、ユーザー希望に合わせて親タスク名を表示する形へ調整した。

#### テスト結果

- `npm run test:backend`: 成功。9 tests passed。
- `npm run test:frontend`: 成功。6 tests passed。
- `docker compose up -d --build`: 成功。
- Playwright確認:
  - キーワード検索 `冷蔵庫` で親タスクが対象外、子タスクのみ1件の状態を確認。
  - ラベルが `子タスク / 親: 買い物リストを作る` と表示されることを確認。
  - 詳細メタの親タスク欄にも `買い物リストを作る` が表示されることを確認。
- `docker compose exec -T frontend npm run build -w frontend`: 成功。
- `docker compose exec -T backend npm run build -w backend`: 成功。

#### テストで落ちた内容

- なし。

### 2026-07-29: フィルタ時の子タスクラベル修正

#### 指示内容

フィルタで絞った結果、親タスクが対象外で子タスクのみのTODOの場合、子タスクに親タスクのラベルが表示されている問題を修正する。

#### 成果物

- `docs/design.md`
  - 親タスクがフィルタ対象外で子タスクのみが表示される場合も、子タスクとして表示する仕様を追記。
- `frontend/src/App.tsx`
  - `buildTaskHierarchy` を修正し、親がフィルタ結果に含まれない子タスクをdepth 1として扱うように変更。
  - 親タスク名が現在のフィルタ結果にない場合、親名を `フィルタ対象外` と表示するように変更。
- `frontend/src/App.test.tsx`
  - 親がフィルタ結果にない子タスクが子タスクとして扱われることを検証するテストを追加。
- `docs/screenshots/todo-filtered-child-label.png`

#### やり直し回数

0回

#### 人間レビューが必要だった箇所

- なし。既存の親子表示ルールの不具合修正として対応した。

#### テスト結果

- `npm run test:frontend`: 成功。6 tests passed。
- `npm run test:backend`: 成功。8 tests passed。
- `docker compose up -d --build`: 成功。
- Playwright確認:
  - キーワード検索 `冷蔵庫` で親タスクが対象外、子タスクのみ1件の状態を確認。
  - 対象タスクのラベルが `子タスク / 親: フィルタ対象外` と表示されることを確認。
- `docker compose exec -T frontend npm run build -w frontend`: 成功。
- `docker compose exec -T backend npm run build -w backend`: 成功。

#### テストで落ちた内容

- なし。
