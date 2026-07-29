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

### Docker

ローカル開発環境での接続確認を安定させるため、Docker Composeでフロントエンドとバックエンドを分離起動できる構成を追加する。

- `backend` サービス
  - `backend/Dockerfile`
  - 公開ポート: `3001`
  - 実行コマンド: `npm run dev -w backend`
- `frontend` サービス
  - `frontend/Dockerfile`
  - 公開ポート: `5173`
  - 実行コマンド: `npm run dev -w frontend -- --host 0.0.0.0`
  - API接続先: `TODO_API_TARGET=http://backend:3001`

理由:

- ホスト環境のプロセス起動・ポート確認権限に左右されにくくする。
- フロントエンドとバックエンドの分離構成を保ったまま、同一ネットワーク内で `/api` proxy を解決できる。
- DBを導入せず、既存のインメモリ実装をそのまま検証できる。

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
| frontend | React | ^19.2.7 | `frontend/package.json` |
| frontend | React DOM | ^19.2.7 | `frontend/package.json` |
| frontend | Vite | ^8.1.0 | `frontend/package.json` |
| frontend | TypeScript | ~6.0.2 | `frontend/package.json` |
| frontend | Vitest | ^4.1.9 | `frontend/package.json` |
| frontend | Testing Library React | ^16.3.2 | `frontend/package.json` |
| frontend | Testing Library jest-dom | ^6.9.1 | `frontend/package.json` |
| frontend | Testing Library user-event | ^14.6.1 | `frontend/package.json` |
| frontend | Playwright | ^1.61.1 | `frontend/package.json` |
| backend | Express | ^5.2.1 | `backend/package.json` |
| backend | cors | ^2.8.6 | `backend/package.json` |
| backend | TypeScript | ^6.0.3 | `backend/package.json` |
| backend | tsx | ^4.22.4 | `backend/package.json` |
| backend | Vitest | ^4.1.9 | `backend/package.json` |
| backend | Supertest | ^7.2.2 | `backend/package.json` |

## 脆弱性対応履歴

| 日付 | 対象 | 変更内容 | 確認元 |
| --- | --- | --- | --- |
| 2026-07-29 | postcss | `8.5.15` から `8.5.24` に更新し、high severity vulnerabilityを解消 | `package-lock.json` |
| 2026-07-29 | nanoid | postcss更新に伴い `3.3.15` から `3.3.16` に更新 | `package-lock.json` |
