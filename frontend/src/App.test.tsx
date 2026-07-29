import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App, {
  buildTaskHierarchy,
  getIncompleteChildren,
  getNextTodayTaskCount,
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
    expect(html).toContain('今日やる上限')
    expect(html).toContain('キーワード検索')
    expect(html).toContain('新規登録')
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
})
