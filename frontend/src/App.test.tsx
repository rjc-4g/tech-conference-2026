import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App, { buildTaskHierarchy } from './App'

describe('App', () => {
  it('renders the todo application shell', () => {
    const html = renderToString(<App />)

    expect(html).toContain('TODO App')
    expect(html).toContain('今日やるTODO')
    expect(html).toContain('カテゴリ設定')
    expect(html).toContain('キーワード検索')
    expect(html).toContain('新規登録')
  })

  it('places child tasks directly after their parent with depth metadata', () => {
    const tasks = [
      {
        id: 'parent',
        title: '親',
        status: 'todo',
        priority: 'medium',
        isToday: false,
        progress: 50,
      },
      {
        id: 'sibling',
        title: '別タスク',
        status: 'todo',
        priority: 'low',
        isToday: false,
        progress: 0,
      },
      {
        id: 'child',
        title: '子',
        status: 'done',
        priority: 'high',
        parentTaskId: 'parent',
        isToday: false,
        progress: 100,
      },
    ] as const

    const hierarchy = buildTaskHierarchy([...tasks])

    expect(hierarchy.map((task) => task.id)).toEqual(['parent', 'child', 'sibling'])
    expect(hierarchy[0].childCount).toBe(1)
    expect(hierarchy[0].completedChildCount).toBe(1)
    expect(hierarchy[1].depth).toBe(1)
  })
})
