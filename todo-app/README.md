# TODOアプリ

AIADで作成するTODOアプリのプロジェクト雛形です。

## 目的

- AI開発の技術検証
- AIDDとAIADの比較
- TODOアプリ開発を通じたAI開発知見の蓄積

## 技術構成

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS

### Backend

- Java 21
- Spring Boot 3.5系
- Spring Web
- Spring Data JPA
- SQLite

### Development

- Docker Compose
- REST API

## ディレクトリ構成

```text
todo-app/
├── frontend/
├── backend/
├── docs/
├── docker-compose.yml
├── README.md
└── .gitignore
```

## 起動方法

### Docker Composeで起動

```bash
docker compose up --build
```

起動後、以下にアクセスします。

```text
Frontend: http://localhost:5173
Backend : http://localhost:8080
```

### Backend単体起動

```bash
cd backend
./gradlew bootRun
```

### Frontend単体起動

```bash
cd frontend
npm install
npm run dev
```

## API

| メソッド | パス | 内容 |
|---|---|---|
| GET | /api/todos | TODO一覧取得 |
| GET | /api/todos/{id} | TODO詳細取得 |
| POST | /api/todos | TODO登録 |
| PUT | /api/todos/{id} | TODO更新 |
| DELETE | /api/todos/{id} | TODO削除 |
| PATCH | /api/todos/{id}/complete | 完了状態切り替え |
| PATCH | /api/todos/reorder | 並び順更新 |
| GET | /api/categories | カテゴリ一覧取得 |

## 次の作業

1. ZIPを展開する
2. Git管理を開始する
3. Backendを起動確認する
4. Frontendを起動確認する
5. AIADツールで機能単位に実装・修正する
