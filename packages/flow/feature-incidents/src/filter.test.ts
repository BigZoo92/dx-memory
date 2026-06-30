import { describe, expect, it } from 'vitest'
import type { Incident } from '@signalops/contracts'
import { filterIncidents } from './filter'

function incident(over: Partial<Incident>): Incident {
  return {
    id: 'inc_1',
    title: 'x',
    severity: 'high',
    status: 'open',
    linkedSignalIds: [],
    owner: 'analyst-001',
    createdAt: '2026-06-01T00:00:00.000Z',
    resolvedAt: null,
    impact: 'user',
    ...over
  }
}

const data: Incident[] = [
  incident({ id: 'a', status: 'open', severity: 'critical', impact: 'security' }),
  incident({ id: 'b', status: 'resolved', severity: 'high', impact: 'user' }),
  incident({ id: 'c', status: 'open', severity: 'high', impact: 'business' })
]

describe('filterIncidents', () => {
  it('returns everything when no filters are set', () => {
    expect(filterIncidents(data, {})).toHaveLength(3)
  })

  it('filters by status', () => {
    expect(filterIncidents(data, { status: 'open' }).map((i) => i.id)).toEqual(['a', 'c'])
  })

  it('combines filters (AND)', () => {
    expect(filterIncidents(data, { status: 'open', severity: 'high' }).map((i) => i.id)).toEqual([
      'c'
    ])
  })

  it('treats empty strings as no filter', () => {
    expect(filterIncidents(data, { status: '', severity: '', impact: '' })).toHaveLength(3)
  })
})
