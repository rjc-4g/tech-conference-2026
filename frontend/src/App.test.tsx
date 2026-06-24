import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the todo application shell', () => {
    const html = renderToString(<App />)

    expect(html).toContain('TODO App')
    expect(html).toContain('今日やるTODO')
    expect(html).toContain('カテゴリ設定')
    expect(html).toContain('キーワード検索')
    expect(html).toContain('新規登録')
  })
})
