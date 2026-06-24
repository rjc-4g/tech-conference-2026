const path = require('path')
const fs = require('fs')
const Database = require('better-sqlite3')

const dbPath = path.resolve(__dirname, '../data/db.sqlite')
if (!fs.existsSync(dbPath)) {
    console.error('DB file not found at', dbPath)
    process.exit(1)
}

const db = new Database(dbPath)

function columnExists(table, column) {
    try {
        const row = db.prepare(`PRAGMA table_info(${table})`).all()
        return row.some(r => r.name === column)
    } catch (e) { return false }
}

if (columnExists('tasks', 'is_today')) {
    console.log('Column `is_today` already present; nothing to do.')
    process.exit(0)
}

console.log('Adding `is_today` column to tasks table...')
try {
    db.prepare('ALTER TABLE tasks ADD COLUMN is_today INTEGER DEFAULT 0').run()
    console.log('Migration completed.')
} catch (e) {
    console.error('Migration failed:', e)
    process.exit(1)
} finally {
    db.close()
}
