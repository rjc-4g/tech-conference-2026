import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App, {
  buildTaskHierarchy,
  formatDate,
  getCategoryCardColors,
  getIncompleteChildren,
  getNextTodayTaskCount,
  isFirstActionUnset,
  isOverdue,
  isStaleTask,
} from './App'

describe('App', () => {
  it('renders the todo application shell', () => {
    const html = renderToString(<App />)

    expect(html).toContain('TODO App')
    expect(html).toContain('今日やるTODO')
    expect(html).toContain('カテゴリ設定')
    expect(html).toContain('設定')
    expect(html).toContain('推奨上限')
    expect(html).toContain('今日やるTODOのみ')
    expect(html).toContain('キーワード検索')
    expect(html).toContain('新規登録')
    expect(html).not.toContain('未着手警告日数')
  })

  it('places child tasks directly after their parent with depth metadata', () => {
    const now = '2026-07-29T00:00:00.000Z'
    const tasks = [
      {
        id: 'parent',
        title: '親',
        status: 'todo',
        priority: 'medium',
        isToday: false,
        createdAt: now,
        updatedAt: now,
        progress: 50,
      },
      {
        id: 'sibling',
        title: '別タスク',
        status: 'todo',
        priority: 'low',
        isToday: false,
        createdAt: now,
        updatedAt: now,
        progress: 0,
      },
      {
        id: 'child',
        title: '子',
        status: 'done',
        priority: 'high',
        parentTaskId: 'parent',
        isToday: false,
        createdAt: now,
        updatedAt: now,
        progress: 100,
      },
    ] as const

    const hierarchy = buildTaskHierarchy([...tasks])

    expect(hierarchy.map((task) => task.id)).toEqual(['parent', 'child', 'sibling'])
    expect(hierarchy[0].childCount).toBe(1)
    expect(hierarchy[0].completedChildCount).toBe(1)
    expect(hierarchy[1].depth).toBe(1)
  })

  it('keeps filtered child tasks marked as children when parent is absent', () => {
    const now = '2026-07-29T00:00:00.000Z'
    const tasks = [
      {
        id: 'child',
        title: 'フィルタされた子タスク',
        status: 'todo',
        priority: 'medium',
        parentTaskId: 'filtered-parent',
        isToday: true,
        createdAt: now,
        updatedAt: now,
        progress: 0,
      },
    ] as const

    const hierarchy = buildTaskHierarchy([...tasks])

    expect(hierarchy).toHaveLength(1)
    expect(hierarchy[0].id).toBe('child')
    expect(hierarchy[0].depth).toBe(1)
    expect(hierarchy[0].childCount).toBe(0)
  })

  it('detects overdue and stale tasks', () => {
    expect(isOverdue({ dueDate: '2026-07-28', status: 'todo' }, '2026-07-29')).toBe(true)
    expect(isOverdue({ dueDate: '2026-07-28', status: 'done' }, '2026-07-29')).toBe(false)
    expect(
      isStaleTask(
        { createdAt: '2026-07-25T00:00:00.000Z', status: 'todo' },
        3,
        new Date('2026-07-29T00:00:00.000Z'),
      ),
    ).toBe(true)
  })

  it('calculates today limit and incomplete child confirmation targets', () => {
    const now = '2026-07-29T00:00:00.000Z'
    const tasks = [
      {
        id: 'parent',
        title: '親',
        status: 'todo',
        priority: 'medium',
        isToday: true,
        createdAt: now,
        updatedAt: now,
        progress: 0,
      },
      {
        id: 'child',
        title: '子',
        status: 'todo',
        priority: 'medium',
        parentTaskId: 'parent',
        isToday: false,
        createdAt: now,
        updatedAt: now,
        progress: 0,
      },
    ] as const

    expect(getNextTodayTaskCount([...tasks], true, null)).toBe(2)
    expect(getIncompleteChildren([...tasks], 'parent')).toHaveLength(1)
  })

  it('detects tasks without first action while excluding completed tasks', () => {
    expect(isFirstActionUnset({ status: 'todo', firstAction: '' })).toBe(true)
    expect(isFirstActionUnset({ status: 'in_progress' })).toBe(true)
    expect(isFirstActionUnset({ status: 'done' })).toBe(false)
    expect(isFirstActionUnset({ status: 'todo', firstAction: '資料を5分開く' })).toBe(false)
  })

  it('formats created date for task metadata', () => {
    expect(formatDate('2026-07-29T05:30:00.000Z')).toBe('2026-07-29')
    expect(formatDate('invalid')).toBe('未設定')
  })

  it('derives card colors from the category color', () => {
    expect(getCategoryCardColors('#0ea5e9')).toEqual({
      color: '#0ea5e9',
      background: 'rgba(14, 165, 233, 0.08)',
      border: 'rgba(14, 165, 233, 0.32)',
    })
    expect(getCategoryCardColors('invalid').color).toBe('#0f766e')
  })
})
