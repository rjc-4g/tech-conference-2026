const request = require('supertest')
const { createApp } = require('../app')
const { createDatabase } = require('../db')

beforeEach(() => {
    const state = expect.getState()
    process.stdout.write(`\n[TEST START] ${state.currentTestName}\n`)
})

async function createTestContext() {
    const db = createDatabase(true)
    const app = createApp({ db })
    await app.ready()
    return { app, db }
}

async function createTask(app, overrides = {}) {
    const response = await request(app.server)
        .post('/api/v1/tasks')
        .send({
            title: 'Task',
            scheduledAt: new Date().toISOString(),
            ...overrides
        })
        .expect(201)

    return response.body.task
}

async function createCategory(app, overrides = {}) {
    const response = await request(app.server)
        .post('/api/v1/categories')
        .send({
            name: 'Category',
            color: '#CCCCCC',
            ...overrides
        })
        .expect(201)

    return response.body.category
}

describe('Tasks API', () => {
    let app
    let db

    beforeEach(async () => {
        const ctx = await createTestContext()
        app = ctx.app
        db = ctx.db
    })

    afterEach(async () => {
        await app.close()
        db.close()
    })

    test('GET /api/v1/tasks returns empty array initially', async () => {
        const response = await request(app.server)
            .get('/api/v1/tasks')
            .expect(200)

        expect(response.body.tasks).toEqual([])
    })

    test('POST /api/v1/tasks creates a task with defaults', async () => {
        const scheduledAt = new Date().toISOString()

        const response = await request(app.server)
            .post('/api/v1/tasks')
            .send({ scheduledAt })
            .expect(201)

        expect(response.body.task.title).toBe('Untitled')
        expect(response.body.task.status).toBe('todo')
        expect(response.body.task.priority_manual).toBe(3)
        expect(response.body.task.scheduled_at).toBe(scheduledAt)
    })

    test('POST /api/v1/tasks rejects missing scheduledAt', async () => {
        const response = await request(app.server)
            .post('/api/v1/tasks')
            .send({ title: 'Invalid' })
            .expect(400)

        expect(response.body.error).toBe('scheduled_at_required')
    })

    test('GET /api/v1/tasks/:id returns created task', async () => {
        const task = await createTask(app, { title: 'Fetch me' })

        const response = await request(app.server)
            .get(`/api/v1/tasks/${task.id}`)
            .expect(200)

        expect(response.body.task.id).toBe(task.id)
        expect(response.body.task.title).toBe('Fetch me')
    })

    test('GET /api/v1/tasks/:id returns 404 for unknown task', async () => {
        const response = await request(app.server)
            .get('/api/v1/tasks/missing')
            .expect(404)

        expect(response.body.error).toBe('not_found')
    })

    test('PUT /api/v1/tasks/:id updates task fields', async () => {
        const task = await createTask(app)
        const nextScheduledAt = new Date(Date.now() + 86400000).toISOString()

        const response = await request(app.server)
            .put(`/api/v1/tasks/${task.id}`)
            .send({
                title: 'Updated',
                description: 'Updated description',
                status: 'doing',
                progress: 40,
                scheduledAt: nextScheduledAt
            })
            .expect(200)

        expect(response.body.task.title).toBe('Updated')
        expect(response.body.task.description).toBe('Updated description')
        expect(response.body.task.status).toBe('doing')
        expect(response.body.task.progress).toBe(40)
        expect(response.body.task.scheduled_at).toBe(nextScheduledAt)
    })

    test('PUT /api/v1/tasks/:id rejects invalid scheduledAt', async () => {
        const task = await createTask(app)

        const response = await request(app.server)
            .put(`/api/v1/tasks/${task.id}`)
            .send({ scheduledAt: 'invalid-date' })
            .expect(400)

        expect(response.body.error).toBe('scheduled_at_required')
    })

    test('PATCH /api/v1/tasks/:id partially updates a task', async () => {
        const task = await createTask(app, { title: 'Partial', progress: 0 })

        const response = await request(app.server)
            .patch(`/api/v1/tasks/${task.id}`)
            .send({ progress: 75 })
            .expect(200)

        expect(response.body.task.title).toBe('Partial')
        expect(response.body.task.progress).toBe(75)
    })

    test('DELETE /api/v1/tasks/:id deletes descendants recursively', async () => {
        const parent = await createTask(app, { title: 'Parent' })
        const child = await createTask(app, { title: 'Child', parentId: parent.id })

        await request(app.server)
            .delete(`/api/v1/tasks/${parent.id}`)
            .expect(204)

        await request(app.server)
            .get(`/api/v1/tasks/${parent.id}`)
            .expect(404)

        await request(app.server)
            .get(`/api/v1/tasks/${child.id}`)
            .expect(404)
    })

    test('POST /api/v1/tasks/reorder updates ordering', async () => {
        const first = await createTask(app, { title: 'First', order: 0 })
        const second = await createTask(app, { title: 'Second', order: 1 })

        await request(app.server)
            .post('/api/v1/tasks/reorder')
            .send({
                orderUpdates: [
                    { id: first.id, order_num: 2 },
                    { id: second.id, order_num: 0 }
                ]
            })
            .expect(200)

        const response = await request(app.server)
            .get('/api/v1/tasks')
            .expect(200)

        expect(response.body.tasks[0].id).toBe(second.id)
        expect(response.body.tasks[1].id).toBe(first.id)
    })

    test('POST /api/v1/tasks/:id/set_today updates task tree', async () => {
        const parent = await createTask(app, { title: 'Parent' })
        const child = await createTask(app, { title: 'Child', parentId: parent.id })

        const response = await request(app.server)
            .post(`/api/v1/tasks/${parent.id}/set_today`)
            .send({ is_today: true })
            .expect(200)

        expect(response.body.ok).toBe(true)
        expect(response.body.changes).toBe(2)

        const parentResult = await request(app.server)
            .get(`/api/v1/tasks/${parent.id}`)
            .expect(200)
        const childResult = await request(app.server)
            .get(`/api/v1/tasks/${child.id}`)
            .expect(200)

        expect(parentResult.body.task.is_today).toBe(1)
        expect(childResult.body.task.is_today).toBe(1)
    })

    test('POST /api/v1/tasks/:id/set_complete marks task tree done', async () => {
        const parent = await createTask(app, { title: 'Parent' })
        const child = await createTask(app, { title: 'Child', parentId: parent.id })

        const response = await request(app.server)
            .post(`/api/v1/tasks/${parent.id}/set_complete`)
            .expect(200)

        expect(response.body.ok).toBe(true)
        expect(response.body.changes).toBe(2)

        const parentResult = await request(app.server)
            .get(`/api/v1/tasks/${parent.id}`)
            .expect(200)
        const childResult = await request(app.server)
            .get(`/api/v1/tasks/${child.id}`)
            .expect(200)

        expect(parentResult.body.task.status).toBe('done')
        expect(parentResult.body.task.progress).toBe(100)
        expect(parentResult.body.task.completed_at).toBeTruthy()
        expect(childResult.body.task.status).toBe('done')
        expect(childResult.body.task.progress).toBe(100)
    })
})

describe('Categories API', () => {
    let app
    let db

    beforeEach(async () => {
        const ctx = await createTestContext()
        app = ctx.app
        db = ctx.db
    })

    afterEach(async () => {
        await app.close()
        db.close()
    })

    test('GET /api/v1/categories returns empty array initially', async () => {
        const response = await request(app.server)
            .get('/api/v1/categories')
            .expect(200)

        expect(response.body.categories).toEqual([])
    })

    test('POST /api/v1/categories creates category with defaults', async () => {
        const response = await request(app.server)
            .post('/api/v1/categories')
            .send({})
            .expect(201)

        expect(response.body.category.name).toBe('新規')
        expect(response.body.category.color).toBe('#CCCCCC')
        expect(response.body.category.order_num).toBe(0)
    })

    test('PUT /api/v1/categories/:id updates category', async () => {
        const category = await createCategory(app)

        const response = await request(app.server)
            .put(`/api/v1/categories/${category.id}`)
            .send({
                name: 'Updated Category',
                color: '#222222',
                order: 10
            })
            .expect(200)

        expect(response.body.category.name).toBe('Updated Category')
        expect(response.body.category.color).toBe('#222222')
        expect(response.body.category.order_num).toBe(10)
    })

    test('DELETE /api/v1/categories/:id clears task category references', async () => {
        const category = await createCategory(app)
        const task = await createTask(app, { categoryId: category.id })

        await request(app.server)
            .delete(`/api/v1/categories/${category.id}`)
            .expect(204)

        const response = await request(app.server)
            .get(`/api/v1/tasks/${task.id}`)
            .expect(200)

        expect(response.body.task.category_id).toBeNull()
    })

    test('DELETE /api/v1/categories/:id returns 404 for unknown category', async () => {
        const response = await request(app.server)
            .delete('/api/v1/categories/missing')
            .expect(404)

        expect(response.body.error).toBe('not_found')
    })
})

describe('Integration', () => {
    let app
    let db

    beforeEach(async () => {
        const ctx = await createTestContext()
        app = ctx.app
        db = ctx.db
    })

    afterEach(async () => {
        await app.close()
        db.close()
    })

    test('supports category-task-complete workflow', async () => {
        const category = await createCategory(app, { name: 'Work', color: '#FF0000' })
        const task = await createTask(app, {
            title: 'Important Task',
            categoryId: category.id,
            priorityManual: 1,
            estimatedMinutes: 120
        })

        await request(app.server)
            .patch(`/api/v1/tasks/${task.id}`)
            .send({ progress: 50 })
            .expect(200)

        await request(app.server)
            .post(`/api/v1/tasks/${task.id}/set_today`)
            .send({ is_today: true })
            .expect(200)

        await request(app.server)
            .post(`/api/v1/tasks/${task.id}/set_complete`)
            .expect(200)

        const response = await request(app.server)
            .get(`/api/v1/tasks/${task.id}`)
            .expect(200)

        expect(response.body.task.status).toBe('done')
        expect(response.body.task.progress).toBe(100)
        expect(response.body.task.is_today).toBe(1)
        expect(response.body.task.category_id).toBe(category.id)
    })
})
