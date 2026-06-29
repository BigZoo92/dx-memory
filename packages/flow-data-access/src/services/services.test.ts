import { describe, expect, it } from 'vitest'
import { getSignals } from '../fixtures/dataset'
import { buildDashboardSummary } from './dashboard-service'
import { buildCompareResponse } from './compare-service'
import { buildDxMetricsResponse } from './metrics-service'
import { buildHealthResponse } from './health-service'

describe('buildDashboardSummary', () => {
  const summary = buildDashboardSummary()

  it('returns four KPIs with trend chips', () => {
    expect(summary.kpis.openSignals.label).toBe('Open signals')
    expect(summary.kpis.avgQualificationTimeMs.display).toMatch(/\d/)
    expect(['up', 'down', 'flat']).toContain(summary.kpis.criticalSignals.trend)
  })

  it('returns a 14-point time series and a severity breakdown', () => {
    expect(summary.signalsOverTime).toHaveLength(14)
    expect(summary.severityBreakdown[0].severity).toBe('critical')
    expect(summary.mostCriticalSignals.length).toBeLessThanOrEqual(8)
  })
})

describe('buildCompareResponse', () => {
  it('builds six diff attributes for a known signal', () => {
    const signal = getSignals()[0]
    const compare = buildCompareResponse(signal.id)
    expect(compare.attributes.map((a) => a.attribute)).toEqual([
      'Severity',
      'Status',
      'Risk score',
      'Confidence',
      'Assigned to',
      'Recommended action'
    ])
    expect(compare.impactSentence).toContain('qualification time')
  })

  it('handles a null-confidence signal without crashing (Unavailable)', () => {
    const nullSignal = getSignals().find((s) => s.confidence === null)!
    const compare = buildCompareResponse(nullSignal.id)
    const confidenceRow = compare.attributes.find((a) => a.attribute === 'Confidence')!
    expect(confidenceRow.before).toBe('Unavailable')
    expect(confidenceRow.after).toBe('Unavailable')
  })
})

describe('buildDxMetricsResponse', () => {
  it('falls back to seed data (3 variants, current=flow)', () => {
    const response = buildDxMetricsResponse()
    expect(response.source).toBe('seed')
    expect(response.current).toBe('flow')
    expect(response.metrics).toHaveLength(3)
  })
})

describe('buildHealthResponse', () => {
  it('reports ok with the Flow variant label', () => {
    const health = buildHealthResponse()
    expect(health.status).toBe('ok')
    expect(health.variant).toBe('Variant B — Flow')
  })
})
