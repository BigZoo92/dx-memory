import { describe, expect, it } from 'vitest'
import type { Signal } from '@signalops/contracts'
import { getSignals } from '../fixtures/dataset'
import { ApiErrorException } from '../api-errors/api-error'
import { getSignalById, getSignalEvents, querySignals } from './signals-repository'

function makeSignal(over: Partial<Signal> = {}): Signal {
  return {
    id: 'sig_x',
    title: 'Signal',
    description: 'd',
    severity: 'medium',
    status: 'new',
    source: 'internal',
    confidence: 0.5,
    riskScore: 50,
    region: 'EU-West',
    assignedTo: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    tags: [],
    hasLinkedIncident: false,
    ...over
  }
}

describe('querySignals — filtering', () => {
  it('filters by severity against the full 10k dataset', () => {
    const result = querySignals({ severity: 'critical', pageSize: 200 })
    expect(result.total).toBeGreaterThan(0)
    expect(result.items.every((s) => s.severity === 'critical')).toBe(true)
  })

  it('combines filters (AND)', () => {
    const result = querySignals({ severity: 'critical', source: 'api', pageSize: 200 })
    expect(result.items.every((s) => s.severity === 'critical' && s.source === 'api')).toBe(true)
  })

  it('returns an empty page (no error) when nothing matches', () => {
    const result = querySignals({ search: 'zzz-no-such-signal-zzz' })
    expect(result.total).toBe(0)
    expect(result.items).toEqual([])
  })
})

describe('querySignals — stable pagination & sort', () => {
  const signals = Array.from({ length: 125 }, (_, i) =>
    makeSignal({ id: `sig_${String(i).padStart(4, '0')}`, riskScore: i % 7 })
  )

  it('paginates without overlap and covers every row exactly once', () => {
    const seen = new Set<string>()
    let page = 1
    let pages = 1
    do {
      const result = querySignals(
        { page, pageSize: 50, sortBy: 'riskScore', sortDirection: 'desc' },
        signals
      )
      pages = result.totalPages
      for (const item of result.items) {
        expect(seen.has(item.id)).toBe(false)
        seen.add(item.id)
      }
      page++
    } while (page <= pages)
    expect(seen.size).toBe(signals.length)
  })

  it('is deterministic — same query yields the same order', () => {
    const a = querySignals({ sortBy: 'riskScore', sortDirection: 'desc', pageSize: 100 }, signals)
    const b = querySignals({ sortBy: 'riskScore', sortDirection: 'desc', pageSize: 100 }, signals)
    expect(a.items.map((s) => s.id)).toEqual(b.items.map((s) => s.id))
  })

  it('clamps an out-of-range page instead of returning garbage', () => {
    const result = querySignals({ page: 9999, pageSize: 50 }, signals)
    expect(result.page).toBe(result.totalPages)
    expect(result.items.length).toBeGreaterThan(0)
  })
})

describe('querySignals — confidence null is preserved', () => {
  it('keeps confidence === null through query + detail (never coerced)', () => {
    const nullSignal = getSignals().find((s) => s.confidence === null)
    expect(nullSignal, 'fixtures should contain null-confidence signals').toBeTruthy()
    const id = nullSignal!.id

    const fromQuery = querySignals({ search: id, pageSize: 5 }).items.find((s) => s.id === id)
    expect(fromQuery?.confidence).toBeNull()

    const detail = getSignalById(id)
    expect(detail.signal.confidence).toBeNull()
  })
})

describe('getSignalById / getSignalEvents — not found', () => {
  it('throws a typed not_found error for an unknown signal', () => {
    expect(() => getSignalById('sig_does_not_exist')).toThrowError(ApiErrorException)
    try {
      getSignalById('sig_does_not_exist')
    } catch (error) {
      expect(error).toBeInstanceOf(ApiErrorException)
      const envelope = (error as ApiErrorException).toApiError()
      expect(envelope.code).toBe('not_found')
      expect(envelope.requestId).toMatch(/^req_/)
      expect((error as ApiErrorException).httpStatus).toBe(404)
    }
  })

  it('returns a real signal detail with linked incident or null', () => {
    const first = getSignals()[0]
    const detail = getSignalById(first.id)
    expect(detail.signal.id).toBe(first.id)
    expect(
      detail.linkedIncident === null || detail.linkedIncident.linkedSignalIds.includes(first.id)
    ).toBe(true)
  })

  it('returns timeline events for a known signal, oldest first', () => {
    const withEvents = getSignals().find((s) => getSignalEvents(s.id).length > 1)
    expect(withEvents).toBeTruthy()
    const events = getSignalEvents(withEvents!.id)
    const sorted = [...events].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
    expect(events).toEqual(sorted)
  })
})
