# 技術スタック選定

作成日: 2026-06-24

## 選定条件

- Codex CLIで扱いやすいこと。
- テストしやすいこと。
- 画面キャプチャを取りやすいこと。
- フロントエンドとバックエンドを分けること。
- 主要ライブラリは初回インストール時に `latest` を指定し、インストール後は `package.json` と lock ファイルに記録されたバージョンを固定版として扱うこと。

## 推奨構成

### 全体

- パッケージ管理: npm workspaces
- 言語: TypeScript
- 構成:
  - `frontend/`
  - `backend/`
  - `docs/`

理由:

- Codex CLIからファイル編集、テスト、ビルドを実行しやすい。
- フロントエンドとバックエンドを分離しつつ、単一リポジトリで管理できる。
- TypeScriptにより、AI実装時の型ミスをテスト前に検出しやすい。

### フロントエンド

- React
- Vite
- TypeScript
- Vitest
- Testing Library
- Playwright

理由:

- Viteは起動とビルドが軽く、Codex CLIでの反復作業に向いている。
- Reactは一般的で、TODOアプリの状態管理やモーダル実装がしやすい。
- VitestとTesting Libraryでコンポーネントテストを作りやすい。
- PlaywrightでE2Eテストと画面キャプチャを取得しやすい。

### バックエンド

- Node.js
- Express
- TypeScript
- Vitest
- Supertest

理由:

- REST APIを簡潔に実装できる。
- フロントエンドと同じTypeScriptで実装できる。
- SupertestでAPIテストを書きやすい。
- 初期検証ではDBを導入せず、インメモリ実装から始められる。

### データ保存

初期実装ではインメモリストアを採用する。

理由:

- Phase 1からPhase 3までの仕様検証を優先できる。
- テストデータの初期化が容易。
- DB導入による設定コストを後回しにできる。

将来的に永続化が必要になった場合は、SQLite + Prismaを候補とする。ただし、追加ライブラリが必要になるため、導入前に理由を説明して承認を得る。

## 初期セットアップ予定コマンド

実行前にユーザ確認を行うこと。

```powershell
npm create vite@latest frontend -- --template react-ts
npm init -y
npm install -w frontend react@latest react-dom@latest
npm install -w frontend -D vite@latest typescript@latest vitest@latest @testing-library/react@latest @testing-library/jest-dom@latest @testing-library/user-event@latest playwright@latest
npm init -w backend -y
npm install -w backend express@latest cors@latest
npm install -w backend -D typescript@latest tsx@latest vitest@latest supertest@latest @types/node@latest @types/express@latest @types/cors@latest @types/supertest@latest
```

注意:

- 上記は候補であり、実際の初回インストール時は `latest` を使う。
- インストール後に `package.json` と lock ファイルへ記録されたバージョンを固定版として扱う。
- 実装中にライブラリを追加・更新しない。
- ライブラリ追加が必要な場合は、理由を説明して承認を得る。

## 画面キャプチャ方針

- Playwrightでブラウザを起動する。
- E2Eテストまたは専用スクリプトで主要画面のスクリーンショットを保存する。
- 最低限、以下を取得対象とする。
  - 初期一覧画面
  - TODO登録モーダル
  - 今日やるTODO表示
  - 期限切れタスク表示
  - 親子タスクと進捗バー

## テストコマンド方針

最終的に以下のようなコマンドで検証できる構成を目指す。

```powershell
npm run test
npm run test:frontend
npm run test:backend
npm run test:e2e
npm run build
```

## 主要ライブラリ記録

実際にインストールした後、以下に `package.json` と lock ファイルで確認したバージョンを記録する。

| 領域 | ライブラリ | バージョン | 確認元 |
| --- | --- | --- | --- |
| frontend | 未インストール | 未定 | 未定 |
| backend | 未インストール | 未定 | 未定 |
