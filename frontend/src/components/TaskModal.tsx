import React, { useEffect, useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

type Props = {
    task: any | null
    onClose: () => void
    onSave: (payload: any) => Promise<void>
    parentForNew?: string | null
    hideParent?: boolean
}

export default function TaskModal({ task, onClose, onSave, parentForNew, hideParent }: Props) {
    const [title, setTitle] = useState(task?.title || '')
    const [description, setDescription] = useState(task?.description || '')
    const [scheduledAt, setScheduledAt] = useState<string | null>(task?.scheduled_at || null)
    const [dueDate, setDueDate] = useState<string | null>(task?.due_date || null)
    const [categoryId, setCategoryId] = useState<string | null>(task?.category_id || null)
    const [parentId, setParentId] = useState<string | null>(task?.parent_id || parentForNew || null)
    const [categories, setCategories] = useState<any[]>([])
    const [possibleParents, setPossibleParents] = useState<any[]>([])

    useEffect(() => {
        setTitle(task?.title || '')
        setDescription(task?.description || '')
        setScheduledAt(task?.scheduled_at || null)
        setDueDate(task?.due_date || null)
        setCategoryId(task?.category_id || null)
        setParentId(task?.parent_id || parentForNew || null)
    }, [task, parentForNew])

    useEffect(() => {
        axios.get(`${API}/api/v1/categories`).then(r => setCategories(r.data.categories || [])).catch(() => { })
        // only include top-level tasks (no parent) as possible parents
        axios.get(`${API}/api/v1/tasks`).then(r => {
            const tasks = r.data.tasks || []
            const topLevel = tasks.filter((t: any) => !t.parent_id)
            setPossibleParents(topLevel)
        }).catch(() => { })
    }, [])

    async function save(e: React.FormEvent) {
        e.preventDefault()
        if (!title || !scheduledAt || !dueDate || !description || !categoryId) {
            alert('タイトル、実行予定日時、期限日時、説明、カテゴリは必須です')
            return
        }
        // If hideParent is true, force parent to parentForNew (may be null for top-level)
        const finalParent = hideParent ? parentForNew : parentId
        const payload = { title, description, scheduledAt, dueDate, categoryId, parentId: finalParent }
        await onSave(payload)
    }

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
            <div className="bg-white rounded p-4 w-96">
                <h3 className="text-lg mb-2">{task ? '編集' : '新規タスク'}</h3>
                <form onSubmit={save}>
                    <div className="mb-2">
                        <label className="block text-sm">タイトル <span className="text-red-600">*</span></label>
                        <input className="w-full border p-1" value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <div className="mb-2">
                        <label className="block text-sm">実行予定日時 <span className="text-red-600">*</span></label>
                        <input type="datetime-local" className="w-full border p-1" value={scheduledAt ? new Date(scheduledAt).toISOString().slice(0, 16) : ''} onChange={(e) => setScheduledAt(e.target.value ? new Date(e.target.value).toISOString() : null)} />
                    </div>
                    <div className="mb-2">
                        <label className="block text-sm">期限日時 <span className="text-red-600">*</span></label>
                        <input type="datetime-local" className="w-full border p-1" value={dueDate ? new Date(dueDate).toISOString().slice(0, 16) : ''} onChange={(e) => setDueDate(e.target.value ? new Date(e.target.value).toISOString() : null)} />
                    </div>
                    <div className="mb-2">
                        <label className="block text-sm">説明 <span className="text-red-600">*</span></label>
                        <textarea className="w-full border p-1" value={description} onChange={(e) => setDescription(e.target.value)} />
                    </div>
                    <div className="mb-2">
                        <label className="block text-sm">カテゴリ <span className="text-red-600">*</span></label>
                        <select className="w-full border p-1" value={categoryId || ''} onChange={(e) => setCategoryId(e.target.value || null)}>
                            <option value="">(なし)</option>
                            {categories.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                        </select>
                    </div>
                    {!hideParent && (
                        <div className="mb-2">
                            <label className="block text-sm">親タスク</label>
                            <select className="w-full border p-1" value={parentId || ''} onChange={(e) => setParentId(e.target.value || null)}>
                                <option value="">(なし)</option>
                                {possibleParents.filter(p => p.id !== task?.id).map(p => (<option key={p.id} value={p.id}>{p.title}</option>))}
                            </select>
                        </div>
                    )}
                    <div className="flex justify-end">
                        <button type="button" className="mr-2 px-3 py-1" onClick={onClose}>キャンセル</button>
                        <button type="submit" className="bg-blue-500 text-white px-3 py-1 rounded">保存</button>
                    </div>
                </form>
            </div>
        </div>
    )
}
