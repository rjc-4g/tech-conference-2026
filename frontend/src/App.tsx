import React, { useEffect, useState } from 'react'
import axios from 'axios'
import TaskModal from './components/TaskModal'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

type Task = {
    id: string
    title: string
    description?: string | null
    status: string
    created_at: string
    progress: number
    scheduled_at?: string | null
    due_date?: string | null
    category_id?: string | null
    parent_id?: string | null
    order_num?: number
    is_today?: number | boolean
}

export default function App() {
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState<Task | null>(null)
    const [newChildParent, setNewChildParent] = useState<string | null>(null)
    const [newChildHide, setNewChildHide] = useState<boolean>(false)
    const [categories, setCategories] = useState<any[]>([])
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
    const [search, setSearch] = useState('')
    const [viewFilter, setViewFilter] = useState<'today' | 'all'>('all')
    const [draggingId, setDraggingId] = useState<string | null>(null)

    useEffect(() => { fetchTasks() }, [])

    async function fetchTasks() {
        setLoading(true)
        try {
            const res = await axios.get(`${API}/api/v1/tasks`)
            setTasks(res.data.tasks || [])
        } catch (e) {
            console.error(e)
        } finally { setLoading(false) }
    }

    async function fetchCategories() {
        try {
            const res = await axios.get(`${API}/api/v1/categories`)
            setCategories(res.data.categories || [])
        } catch (e) { console.error(e) }
    }

    useEffect(() => { fetchCategories() }, [])

    // DEBUG: capture all clicks (capture phase) to verify whether clicks reach the page
    useEffect(() => {
        function dbgClick(e: MouseEvent) {
            try {
                const t = e.target as HTMLElement
                console.log('DBG_CLICK target=', t.tagName, 'class=', t.className, 'text=', (t.textContent || '').trim())
            } catch (err) { console.error(err) }
        }
        document.addEventListener('click', dbgClick, true)
        return () => document.removeEventListener('click', dbgClick, true)
    }, [])

    function isMarkedToday(t: Task) {
        return !!(t as any).is_today
    }

    function isExpired(t: Task) {
        if (!t.due_date) return false
        try {
            const due = new Date(t.due_date)
            const now = new Date()
            return due < now && t.status !== 'done'
        } catch (e) { return false }
    }

    function isCompleted(t: Task) {
        if (t.status === 'done') return true
        if (typeof t.progress === 'number' && t.progress >= 100) return true
        try {
            return computeProgressFor(t.id) >= 100
        } catch (e) {
            return false
        }
    }

    function getBgClass(t: Task) {
        if (isCompleted(t)) return 'bg-gray-100'
        if (isExpired(t)) return 'bg-red-100'
        return ''
    }

    function filteredTasks(includeToday = true): Task[] {
        let list = tasks.slice()
        if (categoryFilter) list = list.filter(t => t.category_id === categoryFilter)
        if (search) {
            const q = search.toLowerCase()
            list = list.filter(t => (t.title || '').toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q))
        }
        if (!includeToday) {
            list = list.filter(t => !isMarkedToday(t))
        }
        list.sort((a, b) => (a.order_num || 0) - (b.order_num || 0) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        return list
    }

    function buildTree(list: Task[]) {
        const map: Record<string, Task[]> = {}
        const roots: Task[] = []
        const byId: Record<string, Task> = {}
        list.forEach(t => { byId[t.id] = t; map[t.id] = [] })
        list.forEach(t => {
            const pid = (t as any).parent_id
            if (pid && byId[pid]) map[pid].push(t)
            else roots.push(t)
        })
        return { roots, map, byId }
    }

    // Compute progress for a task by id. If the task has children, progress is
    // the average of its children's progress (recursive). If no children,
    // treat the task as 0% or 100% based on its completion state.
    function computeProgressFor(taskId: string) {
        const { map, byId } = buildTree(tasks)
        const seen = new Set<string>()
        function compute(id: string): number {
            if (seen.has(id)) return 0
            seen.add(id)
            const children = map[id] || []
            if (children.length === 0) {
                const t = byId[id]
                if (!t) return 0
                const done = (t.status === 'done') || (t.progress >= 100)
                return done ? 100 : 0
            }
            const vals = children.map(c => compute(c.id))
            if (vals.length === 0) return 0
            const sum = vals.reduce((a, b) => a + b, 0)
            return Math.round(sum / vals.length)
        }
        return compute(taskId)
    }

    async function reorderSwap(list: Task[], index: number, dir: 1 | -1) {
        const i = index
        const j = i + dir
        if (j < 0 || j >= list.length) return
        // create new order by swapping in a copy and send full ordering to backend
        const newList = list.slice()
        const tmp = newList[i]
        newList[i] = newList[j]
        newList[j] = tmp
        const updates = newList.map((item, idx) => ({ id: item.id, order_num: idx }))
        try {
            await axios.post(`${API}/api/v1/tasks/reorder`, { orderUpdates: updates })
            fetchTasks()
        } catch (e) { console.error(e) }
    }

    function handleDragStart(e: React.DragEvent, id: string) {
        setDraggingId(id)
        e.dataTransfer.effectAllowed = 'move'
        try { e.dataTransfer.setData('text/plain', id) } catch { }
    }

    function handleDragOver(e: React.DragEvent) {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
    }

    async function handleDrop(e: React.DragEvent, targetId: string) {
        e.preventDefault()
        const draggedId = draggingId || e.dataTransfer.getData('text/plain')
        if (!draggedId || draggedId === targetId) return
        const targetTask = tasks.find(x => x.id === targetId)
        // choose flat list explicitly from full tasks based on is_today
        const flat = targetTask && (targetTask as any).is_today ? tasks.filter(t => isMarkedToday(t)) : tasks.filter(t => !isMarkedToday(t))
        const from = flat.findIndex(x => x.id === draggedId)
        const to = flat.findIndex(x => x.id === targetId)
        if (from === -1 || to === -1) return
        const newList = flat.slice()
        const [item] = newList.splice(from, 1)
        newList.splice(to, 0, item)
        const updates = newList.map((it, idx) => ({ id: it.id, order_num: idx }))
        try {
            await axios.post(`${API}/api/v1/tasks/reorder`, { orderUpdates: updates })
            setDraggingId(null)
            fetchTasks()
        } catch (err) { console.error(err) }
    }

    function openNew() { setEditing(null); setNewChildParent(null); setNewChildHide(true); setShowModal(true) }
    function openNewChild(parentId: string) { setEditing(null); setNewChildParent(parentId); setNewChildHide(true); setShowModal(true) }
    function openEdit(t: Task) { setEditing(t); setNewChildParent((t as any).parent_id || null); setNewChildHide(true); setShowModal(true) }

    async function handleSave(payload: any) {
        if (editing) {
            await axios.put(`${API}/api/v1/tasks/${editing.id}`, payload)
        } else {
            // If creating a child task, inherit parent's is_today so it appears under the parent view
            if (payload.parentId) {
                const parent = tasks.find(t => t.id === payload.parentId)
                if (parent) payload.is_today = (parent as any).is_today ? 1 : 0
            }
            await axios.post(`${API}/api/v1/tasks`, payload)
        }
        setShowModal(false)
        fetchTasks()
    }

    async function handleDelete(id: string) {
        if (!confirm('削除してよいですか？')) return
        await axios.delete(`${API}/api/v1/tasks/${id}`)
        fetchTasks()
    }

    async function markComplete(id: string) {
        const ok = confirm('完了しますか？')
        if (!ok) return
        try {
            await axios.post(`${API}/api/v1/tasks/${id}/set_complete`)
            await fetchTasks()
        } catch (e) {
            console.error(e)
        }
    }

    async function markDoToday(id: string) {
        try {
            console.log('markDoToday: sending patch for', id)
            const res = await axios.patch(`${API}/api/v1/tasks/${id}`, { is_today: 1 })
            console.log('markDoToday: response', res.data)
            const updated = res.data && res.data.task ? res.data.task : null
            if (updated) {
                setTasks(prev => prev.map(t => t.id === id ? ({ ...t, ...updated }) : t))
            } else {
                setTasks(prev => prev.map(t => t.id === id ? ({ ...t, is_today: 1 }) : t))
            }
            await fetchTasks()
            console.log('markDoToday: completed for', id)
        } catch (e) { console.error(e) }
    }

    // Mark a parent task and all its descendant children as today
    async function markDoTodayWithChildren(id: string) {
        try {
            // build tree from full task list (ignore current view filters) to find descendants
            const { map } = buildTree(tasks)
            const collect: string[] = []
            function collectDescendants(currId: string) {
                collect.push(currId)
                const children = map[currId] || []
                for (const c of children) collectDescendants(c.id)
            }
            collectDescendants(id)
            // Use server-side atomic update for subtree
            await axios.post(`${API}/api/v1/tasks/${id}/set_today`, { is_today: 1 })
            await fetchTasks()
            console.log('markDoTodayWithChildren: completed for', id, 'childrenCount=', collect.length - 1)
        } catch (e) { console.error(e) }
    }

    // Unmark a parent task and all its descendant children from Today
    async function unmarkTodayWithChildren(id: string) {
        try {
            // build tree from full task list so we unmark all real descendants
            const { map } = buildTree(tasks)
            const collect: string[] = []
            function collectDescendants(currId: string) {
                collect.push(currId)
                const children = map[currId] || []
                for (const c of children) collectDescendants(c.id)
            }
            collectDescendants(id)
            await axios.post(`${API}/api/v1/tasks/${id}/set_today`, { is_today: 0 })
            await fetchTasks()
            console.log('unmarkTodayWithChildren: completed for', id, 'childrenCount=', collect.length - 1)
        } catch (e) { console.error(e) }
    }

    async function unmarkToday(id: string) {
        try {
            console.log('unmarkToday: sending patch for', id)
            const res = await axios.patch(`${API}/api/v1/tasks/${id}`, { is_today: 0 })
            console.log('unmarkToday: response', res.data)
            const updated = res.data && res.data.task ? res.data.task : null
            if (updated) {
                setTasks(prev => prev.map(t => t.id === id ? ({ ...t, ...updated }) : t))
            } else {
                setTasks(prev => prev.map(t => t.id === id ? ({ ...t, is_today: 0 }) : t))
            }
            await fetchTasks()
        } catch (e) { console.error(e) }
    }

    function todayOnly(list: Task[]) {
        return list.filter(t => (t as any).is_today)
    }

    function getCategory(catId: string | null | undefined) {
        if (!catId) return null
        return categories.find(c => c.id === catId) || null
    }

    function formatScheduledAt(v?: string | null) {
        if (!v) return '未設定'
        const d = new Date(v)
        if (Number.isNaN(d.getTime())) return '未設定'
        return d.toLocaleString()
    }

    return (
        <div className="p-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl">Todo App</h1>
                <div>
                    <button onClick={openNew} className="bg-green-500 text-white px-3 py-2 rounded">新規</button>
                </div>
            </div>
            <div className="flex gap-4 mb-4 items-center">
                <input placeholder="検索" className="border p-2 flex-1" value={search} onChange={(e) => setSearch(e.target.value)} />
                <select value={viewFilter} onChange={(e) => setViewFilter(e.target.value as any)} className="border p-2 ml-2">
                    <option value="today">今日</option>
                    <option value="all">全て</option>
                </select>
                <div className="flex items-center">
                    <select value={categoryFilter || ''} onChange={(e) => setCategoryFilter(e.target.value || null)} className="border p-2">
                        <option value="">全カテゴリ</option>
                        {categories.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                    </select>
                    <button className="ml-2 px-2 py-1 bg-gray-200 rounded" onClick={async () => {
                        const name = prompt('カテゴリ名を入力')
                        if (!name) return
                        try { await axios.post(`${API}/api/v1/categories`, { name }); fetchCategories() } catch (e) { console.error(e) }
                    }}>＋</button>
                    <button className="ml-2 px-2 py-1 bg-gray-200 rounded" onClick={async () => {
                        if (!categoryFilter) return alert('カテゴリを選択してください')
                        const name = prompt('新しいカテゴリ名')
                        if (!name) return
                        try { await axios.put(`${API}/api/v1/categories/${categoryFilter}`, { name }); fetchCategories() } catch (e) { console.error(e) }
                    }}>✎</button>
                    <button className="ml-2 px-2 py-1 bg-red-200 rounded" onClick={async () => {
                        if (!categoryFilter) return alert('カテゴリを選択してください')
                        if (!confirm('カテゴリを削除しますか？（タスクはカテゴリ解除されます）')) return
                        try { await axios.delete(`${API}/api/v1/categories/${categoryFilter}`); setCategoryFilter(null); fetchCategories(); fetchTasks() } catch (e) { console.error(e) }
                    }}>🗑</button>
                </div>
            </div>

            <div className="mb-4">
                <h2 className="font-semibold">今日のTODO</h2>
                {loading ? <div>Loading...</div> : (
                    (() => {
                        // build flat list only from tasks marked as today so non-today items don't appear
                        const flat = tasks.filter(t => isMarkedToday(t))
                        if (flat.length === 0) return <div className="text-sm text-gray-500">今日のタスクはありません</div>
                        const { roots, map } = buildTree(flat)
                        function renderTodayNode(node: Task) {
                            const idx = flat.findIndex(x => x.id === node.id)
                            return (
                                <li key={node.id} className={`border rounded p-2 mb-2 ${getBgClass(node)}`} draggable onDragStart={(e) => handleDragStart(e, node.id)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, node.id)} data-item-id={node.id}>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <div className="font-medium">{node.title}</div>
                                                {getCategory((node as any).category_id) && (
                                                    <span className="text-xs px-2 py-0.5 rounded text-white" style={{ backgroundColor: getCategory((node as any).category_id)!.color }}>
                                                        {getCategory((node as any).category_id)!.name}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-500">{node.description}</div>
                                            <div className="text-lg font-semibold text-sky-700">実行予定日時: {formatScheduledAt(node.scheduled_at)}</div>
                                            {node.due_date && <div className="text-xs text-gray-700">期限: {new Date(node.due_date).toLocaleString()}</div>}
                                            {isExpired(node) && !isCompleted(node) && <div className="text-sm font-bold text-red-700">期限切れです</div>}
                                            <div className="w-40 mt-2 flex items-center gap-2">
                                                <div className="w-full bg-gray-200 h-2 rounded">
                                                    <div style={{ width: `${computeProgressFor(node.id) || 0}%` }} className="bg-blue-500 h-2 rounded" />
                                                </div>
                                                <div className="text-sm text-gray-700 w-10 text-right">{computeProgressFor(node.id) || 0}%</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center">
                                            <button className="mr-2 px-2 py-1 bg-gray-200 rounded" onClick={() => reorderSwap(flat, idx, -1)}>▲</button>
                                            <button className="mr-2 px-2 py-1 bg-gray-200 rounded" onClick={() => reorderSwap(flat, idx, 1)}>▼</button>
                                            <button type="button" className="mr-2 px-2 py-1 bg-purple-500 text-white rounded whitespace-nowrap" onClick={() => unmarkTodayWithChildren(node.id)}>今日やらない</button>
                                            <button className="mr-2 px-2 py-1 bg-green-600 text-white rounded whitespace-nowrap" onClick={() => openNewChild(node.id)}>子タスク新規</button>
                                            <button className="mr-2 px-2 py-1 bg-blue-500 text-white rounded whitespace-nowrap" onClick={() => openEdit(node)}>編集</button>
                                            {!isCompleted(node) && (
                                                <button className="mr-2 px-2 py-1 bg-yellow-500 text-white rounded whitespace-nowrap" onClick={() => markComplete(node.id)}>完了</button>
                                            )}
                                            <button className="px-2 py-1 bg-red-500 text-white rounded whitespace-nowrap" onClick={() => handleDelete(node.id)}>削除</button>
                                        </div>
                                    </div>
                                    {map[node.id] && map[node.id].length > 0 && (
                                        <ul className="pl-6 mt-2">
                                            {map[node.id].map(child => (
                                                <li key={child.id} className={`border-l pl-2 mb-2 ${getBgClass(child)}`} draggable onDragStart={(e) => handleDragStart(e, child.id)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, child.id)} data-item-id={child.id}>
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <div className="font-medium">{child.title}</div>
                                                                {getCategory((child as any).category_id) && (
                                                                    <span className="text-xs px-2 py-0.5 rounded text-white" style={{ backgroundColor: getCategory((child as any).category_id)!.color }}>
                                                                        {getCategory((child as any).category_id)!.name}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-gray-500">{child.description}</div>
                                                            <div className="text-lg font-semibold text-sky-700">実行予定日時: {formatScheduledAt(child.scheduled_at)}</div>
                                                            {child.due_date && <div className="text-xs text-gray-700">期限: {new Date(child.due_date).toLocaleString()}</div>}
                                                            {isExpired(child) && !isCompleted(child) && <div className="text-sm font-bold text-red-700">期限切れです</div>}
                                                            <div className="w-28 mt-1 flex items-center gap-2">
                                                                <div className="w-full bg-gray-200 h-2 rounded">
                                                                    <div style={{ width: `${computeProgressFor(child.id) || 0}%` }} className="bg-blue-500 h-2 rounded" />
                                                                </div>
                                                                <div className="text-xs text-gray-700 w-10 text-right">{computeProgressFor(child.id) || 0}%</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center">
                                                            <button className="mr-2 px-2 py-1 bg-gray-200 rounded" onClick={() => reorderSwap(map[node.id], (map[node.id] || []).findIndex(x => x.id === child.id), -1)}>▲</button>
                                                            <button className="mr-2 px-2 py-1 bg-gray-200 rounded" onClick={() => reorderSwap(map[node.id], (map[node.id] || []).findIndex(x => x.id === child.id), 1)}>▼</button>
                                                            <button className="mr-2 px-2 py-1 bg-blue-500 text-white rounded whitespace-nowrap" onClick={() => openEdit(child)}>編集</button>
                                                            {!isCompleted(child) && (
                                                                <button className="mr-2 px-2 py-1 bg-yellow-500 text-white rounded whitespace-nowrap" onClick={() => markComplete(child.id)}>完了</button>
                                                            )}
                                                            <button className="px-2 py-1 bg-red-500 text-white rounded whitespace-nowrap" onClick={() => handleDelete(child.id)}>削除</button>
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </li>
                            )
                        }
                        return <ul>{roots.map(r => renderTodayNode(r))}</ul>
                    })()
                )}
            </div>

            {viewFilter !== 'today' && (
                <div>
                    <h2 className="font-semibold">全タスク</h2>
                    {loading ? <div>Loading...</div> : (
                        (() => {
                            const flat = filteredTasks(false)
                            const { roots, map } = buildTree(flat)
                            function renderNode(node: Task) {
                                const idx = flat.findIndex(x => x.id === node.id)
                                return (
                                    <li key={node.id} className={`border rounded p-2 mb-2 ${getBgClass(node)}`} draggable onDragStart={(e) => handleDragStart(e, node.id)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, node.id)} data-item-id={node.id}>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <div className="font-medium">{node.title}</div>
                                                    {getCategory((node as any).category_id) && (
                                                        <span className="text-xs px-2 py-0.5 rounded text-white" style={{ backgroundColor: getCategory((node as any).category_id)!.color }}>
                                                            {getCategory((node as any).category_id)!.name}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-500">{node.description}</div>
                                                <div className="text-lg font-semibold text-sky-700">実行予定日時: {formatScheduledAt(node.scheduled_at)}</div>
                                                {node.due_date && <div className="text-xs text-gray-700">期限: {new Date(node.due_date).toLocaleString()}</div>}
                                                {isExpired(node) && !isCompleted(node) && <div className="text-sm font-bold text-red-700">期限切れです</div>}
                                                <div className="w-40 mt-2 flex items-center gap-2">
                                                    <div className="w-full bg-gray-200 h-2 rounded">
                                                        <div style={{ width: `${computeProgressFor(node.id) || 0}%` }} className="bg-blue-500 h-2 rounded" />
                                                    </div>
                                                    <div className="text-sm text-gray-700 w-10 text-right">{computeProgressFor(node.id) || 0}%</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center">
                                                <button className="mr-2 px-2 py-1 bg-gray-200 rounded" onClick={() => reorderSwap(flat, idx, -1)}>▲</button>
                                                <button className="mr-2 px-2 py-1 bg-gray-200 rounded" onClick={() => reorderSwap(flat, idx, 1)}>▼</button>
                                                <button type="button" className="mr-2 px-2 py-1 bg-purple-500 text-white rounded whitespace-nowrap" onClick={() => markDoTodayWithChildren(node.id)}>今日やる</button>
                                                <button className="mr-2 px-2 py-1 bg-green-600 text-white rounded whitespace-nowrap" onClick={() => openNewChild(node.id)}>子タスク新規</button>
                                                <button className="mr-2 px-2 py-1 bg-blue-500 text-white rounded whitespace-nowrap" onClick={() => openEdit(node)}>編集</button>
                                                {!isCompleted(node) && (
                                                    <button className="mr-2 px-2 py-1 bg-yellow-500 text-white rounded whitespace-nowrap" onClick={() => markComplete(node.id)}>完了</button>
                                                )}
                                                <button className="px-2 py-1 bg-red-500 text-white rounded whitespace-nowrap" onClick={() => handleDelete(node.id)}>削除</button>
                                            </div>
                                        </div>
                                        {map[node.id] && map[node.id].length > 0 && (
                                            <ul className="pl-6 mt-2">
                                                {map[node.id].map(child => (
                                                    <li key={child.id} className={`border-l pl-2 mb-2 ${getBgClass(child)}`} draggable onDragStart={(e) => handleDragStart(e, child.id)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, child.id)} data-item-id={child.id}>
                                                        <div className="flex justify-between items-center">
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="font-medium">{child.title}</div>
                                                                    {getCategory((child as any).category_id) && (
                                                                        <span className="text-xs px-2 py-0.5 rounded text-white" style={{ backgroundColor: getCategory((child as any).category_id)!.color }}>
                                                                            {getCategory((child as any).category_id)!.name}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="text-xs text-gray-500">{child.description}</div>
                                                                <div className="text-lg font-semibold text-sky-700">実行予定日時: {formatScheduledAt(child.scheduled_at)}</div>
                                                                {child.due_date && <div className="text-xs text-gray-700">期限: {new Date(child.due_date).toLocaleString()}</div>}
                                                                {isExpired(child) && !isCompleted(child) && <div className="text-sm font-bold text-red-700">期限切れです</div>}
                                                                <div className="w-28 mt-1 flex items-center gap-2">
                                                                    <div className="w-full bg-gray-200 h-2 rounded">
                                                                        <div style={{ width: `${computeProgressFor(child.id) || 0}%` }} className="bg-blue-500 h-2 rounded" />
                                                                    </div>
                                                                    <div className="text-xs text-gray-700 w-10 text-right">{computeProgressFor(child.id) || 0}%</div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center">
                                                                {/* 子タスクは親の操作で一括設定するため、個別の「今日やる」ボタンは非表示 */}
                                                                <button className="mr-2 px-2 py-1 bg-gray-200 rounded" onClick={() => reorderSwap(map[node.id], (map[node.id] || []).findIndex(x => x.id === child.id), -1)}>▲</button>
                                                                <button className="mr-2 px-2 py-1 bg-gray-200 rounded" onClick={() => reorderSwap(map[node.id], (map[node.id] || []).findIndex(x => x.id === child.id), 1)}>▼</button>
                                                                <button className="mr-2 px-2 py-1 bg-blue-500 text-white rounded whitespace-nowrap" onClick={() => openEdit(child)}>編集</button>
                                                                {!isCompleted(child) && (
                                                                    <button className="mr-2 px-2 py-1 bg-yellow-500 text-white rounded whitespace-nowrap" onClick={() => markComplete(child.id)}>完了</button>
                                                                )}
                                                                <button className="px-2 py-1 bg-red-500 text-white rounded whitespace-nowrap" onClick={() => handleDelete(child.id)}>削除</button>
                                                            </div>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </li>
                                )
                            }
                            return <ul>{roots.map(r => renderNode(r))}</ul>
                        })()
                    )}
                </div>
            )}

            {showModal && (
                <TaskModal task={editing} onClose={() => { setShowModal(false); setNewChildParent(null); setNewChildHide(false) }} onSave={async (payload) => { await handleSave(payload); setNewChildParent(null); setNewChildHide(false) }} parentForNew={newChildParent} hideParent={newChildHide} />
            )}
        </div>
    )
}
