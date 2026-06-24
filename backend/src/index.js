const path = require('path')
const fastify = require('fastify')({ logger: true })
const cors = require('@fastify/cors')
const { v4: uuidv4 } = require('uuid')
const { db, init } = require('./db')

init()

// Ensure existing databases get the new `is_today` column if missing
try {
    const cols = db.prepare("PRAGMA table_info(tasks)").all().map(r => r.name)
    if (!cols.includes('is_today')) {
        db.prepare('ALTER TABLE tasks ADD COLUMN is_today INTEGER DEFAULT 0').run()
        fastify.log.info('Migration: added is_today column to tasks')
    }
} catch (e) {
    // If tasks table doesn't exist yet or other error, log and continue
    fastify.log.warn({ err: e }, 'Skipping is_today migration check')
}

fastify.register(cors, { origin: '*' })

const getNow = () => new Date().toISOString()

function daysBetween(a, b) {
    const _a = new Date(a)
    const _b = new Date(b)
    const diff = (_a - _b) / (1000 * 60 * 60 * 24)
    return Math.floor(diff)
}

// Auto-priority calculation removed per user request; manual priority remains supported.

fastify.get('/api/v1/tasks', async (request, reply) => {
    const rows = db.prepare('SELECT * FROM tasks ORDER BY order_num ASC, created_at DESC').all()
    reply.send({ tasks: rows })
})

fastify.post('/api/v1/tasks', async (request, reply) => {
    const body = request.body || {}
    const id = uuidv4()
    const now = getNow()
    const stmt = db.prepare(
        `INSERT INTO tasks (id,title,description,status,category_id,parent_id,order_num,estimated_minutes,next_action,priority_manual,is_today,progress,due_date,created_at,updated_at,completed_at)
     VALUES (@id,@title,@description,@status,@category_id,@parent_id,@order_num,@estimated_minutes,@next_action,@priority_manual,@is_today,@progress,@due_date,@created_at,@updated_at,@completed_at)`
    )
    const task = {
        id,
        title: body.title || 'Untitled',
        description: body.description || null,
        status: 'todo',
        category_id: body.categoryId || null,
        parent_id: body.parentId || null,
        order_num: body.order || 0,
        estimated_minutes: body.estimatedMinutes || 0,
        next_action: body.nextAction || null,
        priority_manual: body.priorityManual || 3,
        progress: body.progress || 0,
        is_today: body.is_today ? 1 : 0,
        due_date: body.dueDate || null,
        created_at: now,
        updated_at: now,
        completed_at: null
    }
    // auto-priority disabled; keep manual priority only
    stmt.run(task)
    reply.code(201).send({ task })
})

fastify.get('/api/v1/tasks/:id', async (request, reply) => {
    const { id } = request.params
    const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
    if (!row) return reply.code(404).send({ error: 'not_found' })
    reply.send({ task: row })
})

fastify.put('/api/v1/tasks/:id', async (request, reply) => {
    const { id } = request.params
    const body = request.body || {}
    const now = getNow()
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
    if (!existing) return reply.code(404).send({ error: 'not_found' })
    const stmt = db.prepare(
        `UPDATE tasks SET title=@title,description=@description,status=@status,category_id=@category_id,parent_id=@parent_id,order_num=@order_num,estimated_minutes=@estimated_minutes,next_action=@next_action,priority_manual=@priority_manual,is_today=@is_today,progress=@progress,due_date=@due_date,updated_at=@updated_at,completed_at=@completed_at WHERE id=@id`
    )
    const info = stmt.run({
        id,
        title: ('title' in body) ? body.title : existing.title,
        description: ('description' in body) ? body.description : existing.description,
        status: ('status' in body) ? body.status : existing.status,
        category_id: ('categoryId' in body) ? body.categoryId : existing.category_id,
        parent_id: ('parentId' in body) ? body.parentId : existing.parent_id,
        order_num: ('order' in body) ? body.order : existing.order_num,
        estimated_minutes: ('estimatedMinutes' in body) ? body.estimatedMinutes : existing.estimated_minutes,
        next_action: ('nextAction' in body) ? body.nextAction : existing.next_action,
        priority_manual: ('priorityManual' in body) ? body.priorityManual : existing.priority_manual,

        progress: ('progress' in body) ? body.progress : existing.progress,
        is_today: ('is_today' in body) ? (body.is_today ? 1 : 0) : existing.is_today,
        due_date: ('dueDate' in body) ? body.dueDate : existing.due_date,
        updated_at: now,
        completed_at: ('completedAt' in body) ? body.completedAt : existing.completed_at
    })
    if (info.changes === 0) return reply.code(404).send({ error: 'not_found' })
    const refreshed = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
    reply.send({ task: refreshed })
})

fastify.patch('/api/v1/tasks/:id', async (request, reply) => {
    const { id } = request.params
    const body = request.body || {}
    // Log incoming patch for debugging
    fastify.log.info({ id, body }, 'PATCH /api/v1/tasks/:id received')
    const now = getNow()
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
    if (!existing) return reply.code(404).send({ error: 'not_found' })
    const updated = Object.assign({}, existing, body, { updated_at: now })
    const stmt = db.prepare(
        `UPDATE tasks SET title=@title,description=@description,status=@status,category_id=@category_id,parent_id=@parent_id,order_num=@order_num,estimated_minutes=@estimated_minutes,next_action=@next_action,priority_manual=@priority_manual,is_today=@is_today,progress=@progress,due_date=@due_date,updated_at=@updated_at,completed_at=@completed_at WHERE id=@id`
    )
    const info = stmt.run({
        id,
        title: updated.title || existing.title,
        description: ('description' in updated) ? updated.description : existing.description,
        status: ('status' in updated) ? updated.status : existing.status,
        category_id: ('category_id' in updated) ? updated.category_id : existing.category_id,
        parent_id: ('parent_id' in updated) ? updated.parent_id : existing.parent_id,
        order_num: typeof updated.order_num === 'number' ? updated.order_num : existing.order_num,
        estimated_minutes: typeof updated.estimated_minutes === 'number' ? updated.estimated_minutes : existing.estimated_minutes,
        next_action: ('next_action' in updated) ? updated.next_action : existing.next_action,
        priority_manual: typeof updated.priority_manual === 'number' ? updated.priority_manual : existing.priority_manual,

        progress: typeof updated.progress === 'number' ? updated.progress : existing.progress,
        is_today: ('is_today' in updated) ? (updated.is_today ? 1 : 0) : existing.is_today,
        due_date: ('due_date' in updated) ? updated.due_date : existing.due_date,
        updated_at: now,
        completed_at: ('completed_at' in updated) ? updated.completed_at : existing.completed_at
    })
    fastify.log.info({ id, changes: info.changes, is_today: ('is_today' in updated) ? updated.is_today : existing.is_today }, 'PATCH /api/v1/tasks/:id applied')
    const refreshed = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
    reply.send({ task: refreshed })
})

fastify.delete('/api/v1/tasks/:id', async (request, reply) => {
    const { id } = request.params
    try {
        // Delete the task and all its descendant children using a recursive CTE
        const del = db.prepare(`WITH RECURSIVE descendants(id) AS (
            SELECT id FROM tasks WHERE id = ?
            UNION ALL
            SELECT t.id FROM tasks t JOIN descendants d ON t.parent_id = d.id
        ) DELETE FROM tasks WHERE id IN (SELECT id FROM descendants)`)
        const info = del.run(id)
        if (info.changes === 0) return reply.code(404).send({ error: 'not_found' })
        reply.code(204).send()
    } catch (e) {
        reply.code(500).send({ error: 'server_error' })
    }
})

fastify.post('/api/v1/tasks/reorder', async (request, reply) => {
    const body = request.body || {}
    const updates = body.orderUpdates || []
    const tx = db.transaction((rows) => {
        const stmt = db.prepare('UPDATE tasks SET order_num = @order_num WHERE id = @id')
        for (const r of rows) stmt.run(r)
    })
    try {
        tx(updates)
        reply.send({ ok: true })
    } catch (e) {
        reply.code(500).send({ error: 'server_error' })
    }
})

// Set is_today for a task and all its descendants (atomic)
fastify.post('/api/v1/tasks/:id/set_today', async (request, reply) => {
    const { id } = request.params
    const body = request.body || {}
    const val = body.is_today ? 1 : 0
    try {
        const upd = db.prepare(`WITH RECURSIVE descendants(id) AS (
            SELECT id FROM tasks WHERE id = ?
            UNION ALL
            SELECT t.id FROM tasks t JOIN descendants d ON t.parent_id = d.id
        ) UPDATE tasks SET is_today = ? WHERE id IN (SELECT id FROM descendants)`)
        const info = upd.run(id, val)
        reply.send({ ok: true, changes: info.changes })
    } catch (e) {
        reply.code(500).send({ error: 'server_error' })
    }
})

// Mark a task and all descendants as complete (status=done, progress=100, completed_at=now)
fastify.post('/api/v1/tasks/:id/set_complete', async (request, reply) => {
    const { id } = request.params
    const now = getNow()
    try {
        const upd = db.prepare(`WITH RECURSIVE descendants(id) AS (
            SELECT id FROM tasks WHERE id = ?
            UNION ALL
            SELECT t.id FROM tasks t JOIN descendants d ON t.parent_id = d.id
        ) UPDATE tasks SET status = 'done', progress = 100, completed_at = ? WHERE id IN (SELECT id FROM descendants)`)
        const info = upd.run(id, now)
        reply.send({ ok: true, changes: info.changes })
    } catch (e) {
        reply.code(500).send({ error: 'server_error' })
    }
})

fastify.get('/api/v1/categories', async (request, reply) => {
    const rows = db.prepare('SELECT * FROM categories ORDER BY order_num ASC').all()
    reply.send({ categories: rows })
})

fastify.post('/api/v1/categories', async (request, reply) => {
    const body = request.body || {}
    const id = uuidv4()
    const now = getNow()
    db.prepare('INSERT INTO categories (id,name,color,order_num,created_at) VALUES (?,?,?,?,?)').run(id, body.name || '新規', body.color || '#CCCCCC', body.order || 0, now)
    const created = db.prepare('SELECT * FROM categories WHERE id = ?').get(id)
    reply.code(201).send({ category: created })
})

fastify.put('/api/v1/categories/:id', async (request, reply) => {
    const { id } = request.params
    const body = request.body || {}
    db.prepare('UPDATE categories SET name = ?, color = ?, order_num = ? WHERE id = ?').run(body.name || 'カテゴリ', body.color || '#CCCCCC', body.order || 0, id)
    const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(id)
    reply.send({ category: updated })
})

fastify.delete('/api/v1/categories/:id', async (request, reply) => {
    const { id } = request.params
    db.prepare('UPDATE tasks SET category_id = NULL WHERE category_id = ?').run(id)
    const info = db.prepare('DELETE FROM categories WHERE id = ?').run(id)
    if (info.changes === 0) return reply.code(404).send({ error: 'not_found' })
    reply.code(204).send()
})

const start = async () => {
    try {
        await fastify.listen({ port: 3000, host: '0.0.0.0' })
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}
start()
