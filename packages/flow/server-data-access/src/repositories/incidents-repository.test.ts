import { describe, expect, it } from 'vitest'
import { runApiEffect } from '../effect/run'
import { getIncidentsEffect } from '../effect/api'
import { getIncidents } from '../fixtures/dataset'
import { queryIncidents } from './incidents-repository'

describe('queryIncidents (pure)', () => {
  const incidents = getIncidents()

  it('filters incidents by status', () => {
    const result = queryIncidents({ status: 'open', pageSize: 200 }, incidents)
    expect(result.items.every((i) => i.status === 'open')).toBe(true)
  })

  it('combines status + impact filters', () => {
    const result = queryIncidents({ status: 'open', impact: 'security', pageSize: 200 }, incidents)
    expect(result.items.every((i) => i.status === 'open' && i.impact === 'security')).toBe(true)
  })

  it('orders newest first and paginates stably', () => {
    const page1 = queryIncidents({ page: 1, pageSize: 10 }, incidents)
    const page2 = queryIncidents({ page: 2, pageSize: 10 }, incidents)
    const overlap = page1.items.some((i) => page2.items.some((j) => j.id === i.id))
    expect(overlap).toBe(false)
    for (let i = 1; i < page1.items.length; i++) {
      expect(page1.items[i - 1].createdAt >= page1.items[i].createdAt).toBe(true)
    }
  })
})

describe('getIncidentsEffect (Effect) — parse + query through runApiEffect', () => {
  it('returns a paginated page for valid params', async () => {
    const result = await runApiEffect(getIncidentsEffect({ status: 'open', pageSize: '20' }))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.items.every((i) => i.status === 'open')).toBe(true)
      expect(result.value.pageSize).toBe(20)
    }
  })

  it('maps an invalid status to a 400 bad_request envelope', async () => {
    const result = await runApiEffect(getIncidentsEffect({ status: 'pending' }))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(400)
      expect(result.error.code).toBe('bad_request')
    }
  })
})
