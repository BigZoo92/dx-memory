import { describe, expect, it } from 'vitest'
import { queryIncidents } from './incidents-repository'

describe('queryIncidents', () => {
  it('filters incidents by status', () => {
    const result = queryIncidents({ status: 'open', pageSize: 200 })
    expect(result.items.every((i) => i.status === 'open')).toBe(true)
  })

  it('combines status + impact filters', () => {
    const result = queryIncidents({ status: 'open', impact: 'security', pageSize: 200 })
    expect(result.items.every((i) => i.status === 'open' && i.impact === 'security')).toBe(true)
  })

  it('orders newest first and paginates stably', () => {
    const page1 = queryIncidents({ page: 1, pageSize: 10 })
    const page2 = queryIncidents({ page: 2, pageSize: 10 })
    const overlap = page1.items.some((i) => page2.items.some((j) => j.id === i.id))
    expect(overlap).toBe(false)
    for (let i = 1; i < page1.items.length; i++) {
      expect(page1.items[i - 1].createdAt >= page1.items[i].createdAt).toBe(true)
    }
  })
})
