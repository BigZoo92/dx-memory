import { describe, expect, it } from 'vitest'
import { makeIncident, makeSignal } from '../test-utils'
import {
  computeKpiValues,
  computeSeverityBreakdown,
  computeSignalsOverTime,
  selectMostCritical
} from './kpis'

describe('computeKpiValues', () => {
  const signals = [
    makeSignal({ id: 's1', severity: 'critical', status: 'new' }),
    makeSignal({
      id: 's2',
      severity: 'critical',
      status: 'investigating',
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T02:00:00.000Z'
    }),
    makeSignal({ id: 's3', severity: 'low', status: 'resolved' }),
    makeSignal({ id: 's4', severity: 'high', status: 'dismissed' })
  ]
  const incidents = [
    makeIncident({ id: 'i1', status: 'open' }),
    makeIncident({ id: 'i2', status: 'in_progress' }),
    makeIncident({ id: 'i3', status: 'resolved' })
  ]

  it('counts open signals (excludes resolved/dismissed)', () => {
    expect(computeKpiValues(signals, incidents).openSignals).toBe(2)
  })

  it('counts open critical signals only', () => {
    // s1 + s2 are critical and open; s3/s4 are closed.
    expect(computeKpiValues(signals, incidents).criticalSignals).toBe(2)
  })

  it('counts active incidents (excludes resolved)', () => {
    expect(computeKpiValues(signals, incidents).activeIncidents).toBe(2)
  })

  it('computes average qualification time over progressed signals', () => {
    // Only s2 progressed past "new" with a positive delta of 2h.
    expect(computeKpiValues(signals, incidents).avgQualificationTimeMs).toBe(2 * 60 * 60 * 1000)
  })
})

describe('computeSeverityBreakdown', () => {
  it('counts open signals per severity, critical-first', () => {
    const breakdown = computeSeverityBreakdown([
      makeSignal({ severity: 'critical', status: 'new' }),
      makeSignal({ severity: 'critical', status: 'resolved' }),
      makeSignal({ severity: 'low', status: 'new' })
    ])
    expect(breakdown).toEqual([
      { severity: 'critical', count: 1 },
      { severity: 'high', count: 0 },
      { severity: 'medium', count: 0 },
      { severity: 'low', count: 1 }
    ])
  })
})

describe('selectMostCritical', () => {
  it('returns the highest-risk open critical/high signals', () => {
    const signals = [
      makeSignal({ id: 'a', severity: 'critical', status: 'new', riskScore: 95 }),
      makeSignal({ id: 'b', severity: 'high', status: 'new', riskScore: 80 }),
      makeSignal({ id: 'c', severity: 'low', status: 'new', riskScore: 99 }),
      makeSignal({ id: 'd', severity: 'critical', status: 'resolved', riskScore: 90 })
    ]
    expect(selectMostCritical(signals, 8).map((s) => s.id)).toEqual(['a', 'b'])
  })
})

describe('computeSignalsOverTime', () => {
  it('buckets signals into the trailing window, oldest first', () => {
    const now = Date.parse('2026-06-14T12:00:00.000Z')
    const series = computeSignalsOverTime(
      [
        makeSignal({ createdAt: '2026-06-14T01:00:00.000Z', severity: 'critical' }),
        makeSignal({ createdAt: '2026-06-14T02:00:00.000Z', severity: 'low' }),
        makeSignal({ createdAt: '2026-06-13T05:00:00.000Z', severity: 'low' })
      ],
      now,
      14
    )
    expect(series).toHaveLength(14)
    expect(series[series.length - 1]).toEqual({ date: '2026-06-14', total: 2, critical: 1 })
    expect(series[series.length - 2]).toEqual({ date: '2026-06-13', total: 1, critical: 0 })
  })
})
