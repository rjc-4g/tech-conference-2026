# tech-conference-2026
2026年度 技術カンファレンス登壇用TODOアプリケーション

Quick start (requires Docker & Docker Compose):

```bash
docker compose up --build
```

- Frontend (Vite): http://localhost:5173
- Backend (Fastify API): http://localhost:3000
Frontend: http://localhost:5173

起動コマンド（プロジェクトルート）:

```powershell
cd c:\project\todo-app
docker compose up --build
```

---

## ドキュメント更新候補

このリポジトリではエージェントワークフローに従い、特定のユーザー発話（例: 「タスク完了」）を受けた際にドキュメントを更新します。
最近の自動更新:

- `AGENTS.md` と `CLAUDE.md` を作成しました（タスク完了ワークフローの定義および履歴を追記）。

必要に応じて、`skill.md`（エージェント向けの機能説明ファイル）をプロジェクトルートに追加しています。エージェントが検出・更新候補を提示できるようにしてください。

（このセクションはエージェントによる自動スキャン結果の要約です）
