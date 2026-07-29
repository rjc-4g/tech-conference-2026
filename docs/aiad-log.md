# AIAD 検証ログ

このファイルは、AIAD検証のために作業単位ごとの指示、成果物、レビュー観点、テスト結果、Codex CLI利用状況を記録する。

## 記録ルール

- 作業開始前と終了後に、Codex CLIの `/status` で確認できた利用状況を記録する。
- 厳密なトークン数が取得できない場合は、その旨を記録する。
- 作業単位ごとに、使用した指示内容と成果物を記録する。
- やり直し回数を記録する。
- 人間レビューが必要だった箇所を記録する。
- Cursorレビューで指摘された内容を記録する。
- テストで落ちた内容を記録する。

## 作業ログ

### 2026-06-24: 設計書・技術選定・AGENTS.md作成

#### 指示内容

TODOアプリをCodex CLIで作るため、以下を段階的に実施する。

- 設計書の作成
- 技術スタックの選定
- AGENTS.mdの作成
- AIAD検証として作業指示、やり直し回数、人間レビュー箇所、Cursorレビュー指摘、テスト失敗、Codex CLI利用状況を記録できるようにする
- ライブラリ利用ルールを明文化する

#### 成果物

- `docs/design.md`
- `docs/tech-stack.md`
- `docs/aiad-log.md`
- `AGENTS.md`

#### Codex CLI利用状況

- 開始前: この実行環境からCodex CLIの対話コマンド `/status` は直接取得できないため、厳密なトークン数は未取得。
- 終了後: この実行環境からCodex CLIの対話コマンド `/status` は直接取得できないため、厳密なトークン数は未取得。

#### やり直し回数

0回

#### 人間レビューが必要だった箇所

- Phase 3の独自価値機能が、ユーザの期待する「登録して満足してしまうことの抑止」に合っているか。
- 技術スタックとしてReact + Vite + Express + TypeScriptで進めてよいか。
- 初期実装でインメモリストアを採用し、DB導入を後回しにしてよいか。

#### Cursorレビュー指摘

未実施。

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

#### Codex CLI利用状況

- 開始前: 厳密なトークン数は取得できなかった。
  理由: 実行環境からCodex CLIの /status を直接確認できないため。
- 終了後: 厳密なトークン数は取得できなかった。
  理由: 実行環境からCodex CLIの /status を直接確認できないため。

#### やり直し回数

0回

#### 人間レビューが必要だった箇所

- Docker Composeを正式な開発起動手段として採用するか。

#### Cursorレビュー指摘

未実施。

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

#### Codex CLI利用状況

- 開始前: 厳密なトークン数は取得できなかった。
  理由: 実行環境からCodex CLIの /status を直接確認できないため。
- 終了後: 厳密なトークン数は取得できなかった。
  理由: 実行環境からCodex CLIの /status を直接確認できないため。

#### やり直し回数

1回

#### 人間レビューが必要だった箇所

- Phase 3の「最初の一歩」「今日やる上限」「未着手タスク警告」の扱い。今回はPhase 3の警告・制御ロジックには踏み込まず、設計済み入力項目の表示に留めた。

#### Cursorレビュー指摘

未実施。

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

#### Codex CLI利用状況

- 開始前: 厳密なトークン数は取得できなかった。
  理由: 実行環境からCodex CLIの /status を直接確認できないため。
- 終了後: 厳密なトークン数は取得できなかった。
  理由: 実行環境からCodex CLIの /status を直接確認できないため。

#### やり直し回数

1回

#### 人間レビューが必要だった箇所

- なし。Phase 2の「タスクの階層化」「進捗バー」の表示改善範囲として実装した。

#### Cursorレビュー指摘

未実施。

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

#### Codex CLI利用状況

- 開始前: 厳密なトークン数は取得できなかった。
  理由: 実行環境からCodex CLIの /status を直接確認できないため。
- 終了後: 厳密なトークン数は取得できなかった。
  理由: 実行環境からCodex CLIの /status を直接確認できないため。

#### やり直し回数

1回

#### 人間レビューが必要だった箇所

- ライブラリ更新が必要なため、ユーザー承認を受けてから実施した。

#### Cursorレビュー指摘

未実施。

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
