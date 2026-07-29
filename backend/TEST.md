# バックエンド APIテスト仕様

## テストの実行

### 準備

```bash
cd backend
```

### テスト実行(docker)

```bash
# テストを実行
docker compose exec backend npm test

```

## テストカバレッジ

### Tasks API テスト

#### GET /api/v1/tasks
- ✅ タスクなし時に空配列を返す
- ✅ 複数タスクをorder_numとcreated_atでソートして返す

#### POST /api/v1/tasks
- ✅ 必須フィールド（scheduledAt）で新規タスク作成
- ✅ titleなし時は「Untitled」がデフォルト
- ✅ scheduledAtなし時に400エラー
- ✅ scheduledAtが無効な日付時に400エラー
- ✅ すべてのオプションフィールドに対応

#### GET /api/v1/tasks/:id
- ✅ IDでタスクを取得
- ✅ 存在しないIDで404エラー

#### PUT /api/v1/tasks/:id
- ✅ 必須フィールド（scheduledAt）でタスク更新
- ✅ scheduledAtなし時は既存値を保持
- ✅ 無効なscheduledAtで400エラー
- ✅ 存在しないIDで404エラー

#### PATCH /api/v1/tasks/:id
- ✅ 部分更新（例：progressのみ）
- ✅ 他フィールドを保持しながら更新
- ✅ 存在しないIDで404エラー

#### DELETE /api/v1/tasks/:id
- ✅ タスク削除
- ✅ タスク及び子孫タスクをすべて削除
- ✅ 存在しないIDで404エラー

#### POST /api/v1/tasks/reorder
- ✅ 複数タスクの順序を更新
- ✅ 空配列で成功応答

#### POST /api/v1/tasks/:id/set_today
- ✅ タスクと子孫に「今日」フラグを設定
- ✅ フラグをクリア

#### POST /api/v1/tasks/:id/set_complete
- ✅ タスクと子孫を完了状態に設定
- ✅ statusを'done'、progressを100、completed_atを設定

### Categories API テスト

#### GET /api/v1/categories
- ✅ カテゴリなし時に空配列を返す
- ✅ カテゴリをorder_numでソートして返す

#### POST /api/v1/categories
- ✅ 必須フィールドでカテゴリ作成
- ✅ デフォルト値を使用（name='新規'、color='#CCCCCC'）
- ✅ orderフィールド対応

#### PUT /api/v1/categories/:id
- ✅ カテゴリ更新
- ✅ オプションフィールド対応

#### DELETE /api/v1/categories/:id
- ✅ カテゴリ削除
- ✅ 削除時、関連タスクのcategory_idをNULLにクリア
- ✅ 存在しないIDで404エラー

### 統合テスト

- ✅ **完全なワークフロー**: カテゴリ作成 → タスク作成 → 更新 → 完了
- ✅ **階層化タスク**: 親→子→孫のツリー構造で動作確認
  - すべてのレベルで「今日」フラグを設定
  - すべてのレベルで完了状態を設定
- ✅ **並行操作**: 複数タスクの並べ替えでデータ整合性確認

## テスト設定

### Jest設定 (`jest.config.js`)

```javascript
{
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/index.js'],
  verbose: true
}
```

### テストデータベース

- **環境**: メモリDB (`:memory:`) を使用
- **初期化**: 各テスト前にテーブル作成
- **クリーンアップ**: 各テスト後にDBを閉じる
- **分離**: テスト間での相互影響なし

## テストの実装ポイント

### データベースの分離
各テストはメモリ内DBを独立して使用するため、テスト間でデータが共有されません。

```javascript
beforeEach(() => {
    db = createDatabase(true)  // メモリDB
    init(db)                   // テーブル作成
    app = createApp(false, false, db)  // アプリ初期化
})

afterEach(async () => {
    await app.close()
    db.close()
})
```

### APIテストのベストプラクティス

1. **ステータスコード確認**: `.expect(200)`, `.expect(404)` など
2. **レスポンス構造確認**: `response.body.task`, `response.body.error`
3. **データ検証**: フィールド値の正確性確認
4. **エラーケース**: 400, 404などの異常系テスト
5. **副作用テスト**: 操作後の関連データ確認

## 拡張可能性

### 今後追加できるテスト

- [ ] パフォーマンステスト（大量データ処理）
- [ ] 同時実行テスト
- [ ] キャッシュ検証
- [ ] トランザクション整合性テスト
- [ ] バリデーション強化テスト
- [ ] レート制限テスト

## 実行例

```bash
$ npm test

 PASS  src/__tests__/api.test.js (8.234 s)
  Tasks API
    GET /api/v1/tasks
      ✓ should return empty tasks array when no tasks exist (45 ms)
      ✓ should return all tasks ordered by order_num and created_at (52 ms)
    POST /api/v1/tasks
      ✓ should create a new task with required fields (38 ms)
      ✓ should use default title "Untitled" when title not provided (35 ms)
      ✓ should fail when scheduledAt is missing (32 ms)
      ...

Test Suites: 1 passed, 1 total
Tests:       45 passed, 45 total
```

## トラブルシューティング

### npm install エラーが出る

better-sqlite3のコンパイルに問題がある場合、以下を試してください：

```bash
# Windows
npm install --build-from-source

# または prebuilt バイナリを使用
npm install --prefer-offline
```

### テスト実行エラー

- データベースがロックされている → 既存のプロセスを終了
- モジュールが見つからない → `npm install` を再実行
- ポート競合 → 別のサービスがポート3000を使用していないか確認
