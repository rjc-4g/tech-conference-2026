# Tech Stack Selection

このドキュメントは、本プロトタイプで採用した技術選定とその理由をまとめたものです。

## フロントエンド
- 使用言語: TypeScript + React
  - 理由: 型安全性 (TypeScript) とコンポーネントベース開発により、UI の拡張性と保守性が高い。React はエコシステムが豊富で Vite と相性が良い。
- ビルド/ランタイム: Vite
  - 理由: 高速な開発サーバーと軽量ビルドでプロトタイプに適している。
- スタイリング: Tailwind CSS
  - 理由: ユーティリティファーストで素早く UI を整えられるため、プロトタイプ短時間開発に向く。
- HTTP クライアント: axios
  - 理由: シンプルな API 呼び出しとエラーハンドリングで導入が簡単。

ファイル例:
- `frontend/src/App.tsx` — メイン UI とタスクロジック
- `frontend/src/components/TaskModal.tsx` — タスク作成/編集モーダル

## バックエンド
- 使用言語: JavaScript (Node.js)
  - 理由: 軽量で素早く実装でき、フロントエンドと同一ランタイムに親和性があるためプロトタイプに適する。
- フレームワーク: Fastify
  - 理由: 高速かつシンプルなルーティング設計。小規模 API に適している。
- DB 接続: better-sqlite3（SQLite を直接操作）
  - 理由: ファイルベースの軽量 DB でセットアップが容易。プロトタイプや小規模アプリに最適。
- ユーティリティ: uuid（ID 生成）

ファイル例:
- `backend/src/index.js` — API エンドポイントとビジネスロジック
- `backend/src/db.js` — DB 初期化とスキーマ管理

## データ保存形式
- SQLite（ファイル: `backend/data/db.sqlite`）
  - 理由: サーバ不要でローカルに永続化でき、移植が容易。マイグレーションは起動時チェックで簡易対応。
- テーブル: `tasks`, `categories` を中心に、`is_today`, `order_num`, `parent_id`, `progress`, `due_date` 等を保持。

## Docker / コンテナ定義
- Docker Compose を使用してフロントエンド（Vite）とバックエンド（Node/Fastify）を同時に立ち上げる構成。
  - 起動: `docker compose up --build`（プロジェクトルート）
  - 理由: 環境差を軽減し、ローカルでの再現性を確保するため。

ファイル例:
- `docker-compose.yml` — サービス定義（frontend / backend）

## 補足 / 運用上の注意
- 本構成はプロトタイプ向けの最小限スタックに最適化されています。将来的にスケールする場合は、SQLite から PostgreSQL などのサーバ型 DB への移行、バックエンドの型安全化（TypeScript 化）や認証導入を検討してください。

---
作成日: 2026-06-25
