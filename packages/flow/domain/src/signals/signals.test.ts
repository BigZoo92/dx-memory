import { describe, expect, it } from 'vitest'
import { makeSignal } from '../test-utils'
import { compareSeverityDesc, severityRank } from './severity'
import { normalizeConfidence, confidenceLabel } from './confidence'
import { riskBand, averageRiskScore } from './risk'
import { filterSignals, matchesSignalFilters, UNASSIGNED } from './filter'
import { sortSignals } from './sort'

describe('severity', () => {
  it('ranks critical above high above medium above low', () => {
    expect(severityRank('critical')).toBeGreaterThan(severityRank('high'))
    expect(severityRank('high')).toBeGreaterThan(severityRank('medium'))
    expect(severityRank('medium')).toBeGreaterThan(severityRank('low'))
  })

  it('sorts severities critical-first with the descending comparator', () => {
    const order = (['low', 'critical', 'medium', 'high'] as const).slice().sort(compareSeverityDesc)
    expect(order).toEqual(['critical', 'high', 'medium', 'low'])
  })
})

describe('confidence', () => {
  it('maps null to the "Unavailable" state without throwing', () => {
    const result = normalizeConfidence(null)
    expect(result.available).toBe(false)
    expect(result.label).toBe('Unavailable')
    expect(result.percent).toBe(0)
    expect(result.band).toBe('unavailable')
  })

  it('labels a null-confidence signal "Unavailable"', () => {
    expect(confidenceLabel(makeSignal({ confidence: null }))).toBe('Unavailable')
  })

  it('bands numeric confidence and clamps out-of-range values', () => {
    expect(normalizeConfidence(0.9).label).toBe('High')
    expect(normalizeConfidence(0.5).label).toBe('Medium')
    expect(normalizeConfidence(0.1).label).toBe('Low')
    expect(normalizeConfidence(1.5).percent).toBe(100)
    expect(normalizeConfidence(-1).percent).toBe(0)
  })
})

describe('risk', () => {
  it('bands risk score by the reference thresholds', () => {
    expect(riskBand(90)).toBe('critical')
    expect(riskBand(75)).toBe('high')
    expect(riskBand(55)).toBe('medium')
    expect(riskBand(20)).toBe('low')
  })

  it('averages risk scores and returns 0 for an empty set', () => {
    expect(averageRiskScore([10, 20, 30])).toBe(20)
    expect(averageRiskScore([])).toBe(0)
  })
})

describe('filters (combinable)', () => {
  const signals = [
    makeSignal({
      id: 's1',
      severity: 'critical',
      status: 'new',
      source: 'api',
      assignedTo: 'ana_1',
      title: 'Partner API latency spike'
    }),
    makeSignal({
      id: 's2',
      severity: 'critical',
      status: 'triaged',
      source: 'web',
      assignedTo: null,
      title: 'Critical workflow failure'
    }),
    makeSignal({
      id: 's3',
      severity: 'low',
      status: 'new',
      source: 'api',
      assignedTo: 'ana_1',
      title: 'Manual review required'
    })
  ]

  it('applies a single filter', () => {
    expect(filterSignals(signals, { severity: 'critical' }).map((s) => s.id)).toEqual(['s1', 's2'])
  })

  it('combines filters with AND semantics', () => {
    const result = filterSignals(signals, {
      severity: 'critical',
      source: 'api',
      assignedTo: 'ana_1'
    })
    expect(result.map((s) => s.id)).toEqual(['s1'])
  })

  it('matches the "Unassigned" sentinel', () => {
    expect(filterSignals(signals, { assignedTo: UNASSIGNED }).map((s) => s.id)).toEqual(['s2'])
  })

  it('searches across title, id, source and assignee, case-insensitively', () => {
    expect(matchesSignalFilters(signals[0], { search: 'PARTNER' })).toBe(true)
    expect(matchesSignalFilters(signals[0], { search: 's1' })).toBe(true)
    expect(matchesSignalFilters(signals[0], { search: 'nope' })).toBe(false)
  })

  it('filters by ISO date range', () => {
    const dated = [
      makeSignal({ id: 'a', createdAt: '2026-06-01T00:00:00.000Z' }),
      makeSignal({ id: 'b', createdAt: '2026-06-10T00:00:00.000Z' })
    ]
    expect(filterSignals(dated, { dateFrom: '2026-06-05T00:00:00.000Z' }).map((s) => s.id)).toEqual(
      ['b']
    )
    expect(filterSignals(dated, { dateTo: '2026-06-05T00:00:00.000Z' }).map((s) => s.id)).toEqual([
      'a'
    ])
  })
})

describe('stable sort', () => {
  it('sorts by risk score descending with an id tiebreaker', () => {
    const signals = [
      makeSignal({ id: 'b', riskScore: 90 }),
      makeSignal({ id: 'a', riskScore: 90 }),
      makeSignal({ id: 'c', riskScore: 50 })
    ]
    expect(sortSignals(signals, 'riskScore', 'desc').map((s) => s.id)).toEqual(['a', 'b', 'c'])
  })

  it('keeps null confidence at the bottom of a descending sort', () => {
    const signals = [
      makeSignal({ id: 'a', confidence: null }),
      makeSignal({ id: 'b', confidence: 0.9 }),
      makeSignal({ id: 'c', confidence: 0.2 })
    ]
    expect(sortSignals(signals, 'confidence', 'desc').map((s) => s.id)).toEqual(['b', 'c', 'a'])
  })

  it('is deterministic across repeated calls (stable pagination)', () => {
    const signals = Array.from({ length: 50 }, (_, i) =>
      makeSignal({ id: `s${String(i).padStart(3, '0')}`, riskScore: i % 5 })
    )
    const first = sortSignals(signals, 'riskScore', 'desc').map((s) => s.id)
    const second = sortSignals(signals, 'riskScore', 'desc').map((s) => s.id)
    expect(first).toEqual(second)
  })
})
