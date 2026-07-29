const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

function createDatabase(useMemory = false) {
  let db
  
  if (useMemory) {
    db = new Database(':memory:')
  } else {
    const dataDir = path.resolve(__dirname, '../data')
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
    const dbFile = path.join(dataDir, 'db.sqlite')
    db = new Database(dbFile)
  }

  return db
}

function init(db) {
  db.prepare(
    `CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT,
      order_num INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )`
  ).run()

  db.prepare(
    `CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo',
      category_id TEXT,
      parent_id TEXT,
      order_num INTEGER DEFAULT 0,
      estimated_minutes INTEGER DEFAULT 0,
      next_action TEXT,
      priority_manual INTEGER DEFAULT 3,
      is_today INTEGER DEFAULT 0,
      progress INTEGER DEFAULT 0,
      scheduled_at TEXT,
      due_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT
    )`
  ).run()
}

const db = createDatabase(false)
init(db)

module.exports = { db, createDatabase, init }
