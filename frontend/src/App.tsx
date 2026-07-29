import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import './App.css'

type TaskStatus = 'todo' | 'in_progress' | 'done'
type TaskPriority = 'low' | 'medium' | 'high'

type Task = {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  dueDate?: string
  categoryId?: string
  parentTaskId?: string
  firstAction?: string
  isToday: boolean
  progress: number
}

type HierarchyTask = Task & {
  depth: number
  childCount: number
  completedChildCount: number
}

type Category = {
  id: string
  name: string
  color: string
}

type TaskFormState = {
  title: string
  description: string
  dueDate: string
  categoryId: string
  priority: TaskPriority
  isToday: boolean
  parentTaskId: string
  firstAction: string
}

const emptyForm: TaskFormState = {
  title: '',
  description: '',
  dueDate: '',
  categoryId: '',
  priority: 'medium',
  isToday: false,
  parentTaskId: '',
  firstAction: '',
}

const statusLabels: Record<TaskStatus, string> = {
  todo: '未着手',
  in_progress: '着手中',
  done: '完了',
}

const priorityLabels: Record<TaskPriority, string> = {
  low: '低',
  medium: '中',
  high: '高',
}

function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [categoryId, setCategoryId] = useState('all')
  const [sort, setSort] = useState('createdAt')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [form, setForm] = useState<TaskFormState>(emptyForm)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState('#2563eb')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const todayTasks = useMemo(
    () => tasks.filter((task) => task.isToday && task.status !== 'done'),
    [tasks],
  )
  const visibleTasks = useMemo(() => buildTaskHierarchy(tasks), [tasks])

  useEffect(() => {
    void loadInitialData()
  }, [])

  async function loadInitialData() {
    setIsLoading(true)
    setError('')
    try {
      const [taskResponse, categoryResponse] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/categories'),
      ])
      if (!taskResponse.ok || !categoryResponse.ok) {
        throw new Error('API request failed')
      }
      setTasks(await taskResponse.json())
      setCategories(await categoryResponse.json())
    } catch {
      setError('APIに接続できません。backend を起動してください。')
    } finally {
      setIsLoading(false)
    }
  }

  async function loadTasks() {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (status !== 'all') params.set('status', status)
    if (categoryId !== 'all') params.set('categoryId', categoryId)
    params.set('sort', sort)

    const response = await fetch(`/api/tasks?${params.toString()}`)
    if (!response.ok) {
      setError('タスク一覧の取得に失敗しました。')
      return
    }
    setTasks(await response.json())
  }

  useEffect(() => {
    if (!isLoading) {
      void loadTasks()
    }
  }, [query, status, categoryId, sort])

  function openCreateModal() {
    setEditingTask(null)
    setForm(emptyForm)
    setIsModalOpen(true)
  }

  function openEditModal(task: Task) {
    setEditingTask(task)
    setForm({
      title: task.title,
      description: task.description ?? '',
      dueDate: task.dueDate ?? '',
      categoryId: task.categoryId ?? '',
      priority: task.priority,
      isToday: task.isToday,
      parentTaskId: task.parentTaskId ?? '',
      firstAction: task.firstAction ?? '',
    })
    setIsModalOpen(true)
  }

  async function saveTask(event: FormEvent) {
    event.preventDefault()
    setError('')

    const payload = {
      ...form,
      categoryId: form.categoryId || undefined,
      parentTaskId: form.parentTaskId || undefined,
      dueDate: form.dueDate || undefined,
      firstAction: form.firstAction || undefined,
    }

    const response = await fetch(editingTask ? `/api/tasks/${editingTask.id}` : '/api/tasks', {
      method: editingTask ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const body = await response.json().catch(() => null)
      setError(body?.message ?? 'タスクの保存に失敗しました。')
      return
    }

    setIsModalOpen(false)
    await loadTasks()
  }

  async function saveCategory(event: FormEvent) {
    event.preventDefault()
    setError('')

    const response = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCategoryName, color: newCategoryColor }),
    })

    if (!response.ok) {
      const body = await response.json().catch(() => null)
      setError(body?.message ?? 'カテゴリの保存に失敗しました。')
      return
    }

    const category = await response.json()
    setCategories([...categories, category].sort((a, b) => a.name.localeCompare(b.name)))
    setNewCategoryName('')
    setNewCategoryColor('#2563eb')
  }

  async function updateTaskAction(task: Task, action: 'start' | 'complete' | 'delete') {
    const method = action === 'delete' ? 'DELETE' : 'PATCH'
    const path = action === 'delete' ? `/api/tasks/${task.id}` : `/api/tasks/${task.id}/${action}`
    const response = await fetch(path, { method })

    if (!response.ok) {
      setError('タスク操作に失敗しました。')
      return
    }
    await loadTasks()
  }

  function categoryName(id?: string) {
    return categories.find((category) => category.id === id)?.name ?? '未分類'
  }

  function parentTaskTitle(id?: string) {
    return tasks.find((task) => task.id === id)?.title ?? 'なし'
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <h1>TODO App</h1>
          <p>今日やることを絞り、期限とカテゴリで整理する。</p>
        </div>
        <button type="button" className="primary-button" onClick={openCreateModal}>
          + 新規登録
        </button>
      </header>

      {error && <p className="error-banner">{error}</p>}

      <section className="today-band" aria-labelledby="today-title">
        <div>
          <h2 id="today-title">今日やるTODO</h2>
          <p>{todayTasks.length}件 / 推奨上限 3件</p>
        </div>
        <div className="today-list">
          {todayTasks.length === 0 ? (
            <span>対象タスクはありません。</span>
          ) : (
            todayTasks.map((task) => <span key={task.id}>{task.title}</span>)
          )}
        </div>
      </section>

      <section className="filters" aria-label="検索とフィルタ">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="キーワード検索"
        />
        <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
          <option value="all">すべてのカテゴリ</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">すべての状態</option>
          <option value="todo">未着手</option>
          <option value="in_progress">着手中</option>
          <option value="done">完了</option>
        </select>
        <select value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="createdAt">作成日順</option>
          <option value="dueDate">期限が近い順</option>
          <option value="priority">優先度順</option>
          <option value="incomplete">未完了優先</option>
        </select>
      </section>

      <section className="category-panel" aria-labelledby="category-title">
        <div>
          <h2 id="category-title">カテゴリ設定</h2>
          <div className="category-list">
            {categories.map((category) => (
              <span key={category.id}>
                <i style={{ background: category.color }} aria-hidden="true" />
                {category.name}
              </span>
            ))}
          </div>
        </div>
        <form className="category-form" onSubmit={saveCategory}>
          <input
            required
            maxLength={40}
            value={newCategoryName}
            onChange={(event) => setNewCategoryName(event.target.value)}
            placeholder="カテゴリ名"
          />
          <input
            type="color"
            value={newCategoryColor}
            onChange={(event) => setNewCategoryColor(event.target.value)}
            aria-label="カテゴリ色"
          />
          <button type="submit">追加</button>
        </form>
      </section>

      <section className="task-list" aria-label="タスク一覧">
        {isLoading ? (
          <p className="empty-state">読み込み中...</p>
        ) : tasks.length === 0 ? (
          <p className="empty-state">タスクがありません。</p>
        ) : (
          visibleTasks.map((task) => (
            <article
              key={task.id}
              className={[
                task.status === 'done' ? 'task done' : 'task',
                task.depth > 0 ? 'child-task' : 'parent-task',
              ].join(' ')}
              style={{ '--task-depth': task.depth } as CSSProperties & Record<'--task-depth', number>}
            >
              <div className="task-main">
                <div>
                  <div className="relationship-row">
                    {task.depth === 0 ? (
                      <span className="relationship-badge parent-badge">
                        親タスク
                        {task.childCount > 0 && ` / 子 ${task.completedChildCount}/${task.childCount}`}
                      </span>
                    ) : (
                      <span className="relationship-badge child-badge">
                        子タスク / 親: {parentTaskTitle(task.parentTaskId)}
                      </span>
                    )}
                  </div>
                  <h2>{task.title}</h2>
                  {task.description && <p>{task.description}</p>}
                </div>
                <span className={`priority ${task.priority}`}>優先度 {priorityLabels[task.priority]}</span>
              </div>
              <dl className="task-meta">
                <div>
                  <dt>期限</dt>
                  <dd>{task.dueDate ?? '未設定'}</dd>
                </div>
                <div>
                  <dt>カテゴリ</dt>
                  <dd>{categoryName(task.categoryId)}</dd>
                </div>
                <div>
                  <dt>状態</dt>
                  <dd>{statusLabels[task.status]}</dd>
                </div>
                <div>
                  <dt>親タスク</dt>
                  <dd>{task.depth === 0 ? `${task.childCount}件の子タスク` : parentTaskTitle(task.parentTaskId)}</dd>
                </div>
                <div>
                  <dt>進捗</dt>
                  <dd>{task.progress}%</dd>
                </div>
              </dl>
              {task.firstAction && (
                <p className="first-action">
                  <span>最初の一歩</span>
                  {task.firstAction}
                </p>
              )}
              <div className="progress" aria-label={`進捗 ${task.progress}%`}>
                <span style={{ width: `${task.progress}%` }} />
              </div>
              <div className="task-actions">
                <button type="button" onClick={() => openEditModal(task)}>
                  編集
                </button>
                <button type="button" onClick={() => updateTaskAction(task, 'start')}>
                  開始
                </button>
                <button type="button" onClick={() => updateTaskAction(task, 'complete')}>
                  完了
                </button>
                <button type="button" className="danger" onClick={() => updateTaskAction(task, 'delete')}>
                  削除
                </button>
              </div>
            </article>
          ))
        )}
      </section>

      {isModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <form className="modal" onSubmit={saveTask} aria-label="タスク登録編集">
            <div className="modal-header">
              <h2>{editingTask ? 'TODO編集' : 'TODO登録'}</h2>
              <button type="button" aria-label="閉じる" onClick={() => setIsModalOpen(false)}>
                x
              </button>
            </div>
            <label>
              タイトル
              <input
                required
                maxLength={100}
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </label>
            <label>
              説明
              <textarea
                maxLength={1000}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </label>
            <label>
              最初の一歩
              <input
                maxLength={100}
                value={form.firstAction}
                onChange={(event) => setForm({ ...form, firstAction: event.target.value })}
              />
            </label>
            <div className="form-grid">
              <label>
                期限
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
                />
              </label>
              <label>
                優先度
                <select
                  value={form.priority}
                  onChange={(event) => setForm({ ...form, priority: event.target.value as TaskPriority })}
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                </select>
              </label>
            </div>
            <div className="form-grid">
              <label>
                カテゴリ
                <select
                  value={form.categoryId}
                  onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
                >
                  <option value="">未分類</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                親タスク
                <select
                  value={form.parentTaskId}
                  onChange={(event) => setForm({ ...form, parentTaskId: event.target.value })}
                >
                  <option value="">なし</option>
                  {tasks
                    .filter((task) => task.id !== editingTask?.id)
                    .map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.title}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.isToday}
                onChange={(event) => setForm({ ...form, isToday: event.target.checked })}
              />
              今日やるTODOにする
            </label>
            <div className="modal-actions">
              <button type="button" onClick={() => setIsModalOpen(false)}>
                キャンセル
              </button>
              <button type="submit" className="primary-button">
                保存
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  )
}

export function buildTaskHierarchy(tasks: Task[]): HierarchyTask[] {
  const byParent = new Map<string, Task[]>()
  const byId = new Map(tasks.map((task) => [task.id, task]))

  for (const task of tasks) {
    if (!task.parentTaskId || !byId.has(task.parentTaskId)) {
      continue
    }
    byParent.set(task.parentTaskId, [...(byParent.get(task.parentTaskId) ?? []), task])
  }

  const childIds = new Set(tasks.filter((task) => task.parentTaskId).map((task) => task.id))
  const roots = tasks.filter((task) => !childIds.has(task.id))
  const result: HierarchyTask[] = []
  const visited = new Set<string>()

  function append(task: Task, depth: number) {
    if (visited.has(task.id)) {
      return
    }
    visited.add(task.id)

    const children = byParent.get(task.id) ?? []
    result.push({
      ...task,
      depth,
      childCount: children.length,
      completedChildCount: children.filter((child) => child.status === 'done').length,
    })

    for (const child of children) {
      append(child, depth + 1)
    }
  }

  for (const root of roots) {
    append(root, 0)
  }

  for (const task of tasks) {
    append(task, 0)
  }

  return result
}

export default App
