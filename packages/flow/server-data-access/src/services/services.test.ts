import { describe, expect, it } from 'vitest'
import { getAnalysts, getEvents, getIncidents, getSignals } from '../fixtures/dataset'
import { runApiEffect } from '../effect/run'
import {
  getCompareEffect,
  getDashboardSummaryEffect,
  getDxMetricsEffect,
  getHealthEffect
} from '../effect/api'
import { buildDashboardSummary } from './dashboard-service'
import { buildCompareResponse } from './compare-service'
import { buildDxMetricsResponse } from './metrics-service'
import { buildHealthResponse } from './health-service'

describe('buildDashboardSummary (pure)', () => {
  it('returns four KPIs with trend chips', () => {
    const summary = buildDashboardSummary(getSignals(), getIncidents())
    expect(summary.kpis.openSignals.label).toBe('Open signals')
    expect(summary.kpis.avgQualificationTimeMs.display).toMatch(/\d/)
    expect(['up', 'down', 'flat']).toContain(summary.kpis.criticalSignals.trend)
  })
})

describe('DashboardService (Effect) via runApiEffect', () => {
  it('returns a 14-point time series and a severity breakdown', async () => {
    const result = await runApiEffect(getDashboardSummaryEffect())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.signalsOverTime).toHaveLength(14)
      expect(result.value.severityBreakdown[0].severity).toBe('critical')
      expect(result.value.mostCriticalSignals.length).toBeLessThanOrEqual(8)
      expect(result.value.kpis.avgQualificationTimeMs.display).toMatch(/\d/)
    }
  })
})

describe('buildCompareResponse (pure)', () => {
  it('builds six diff attributes for a resolved signal', () => {
    const signal = getSignals()[0]
    const compare = buildCompareResponse(signal, getAnalysts(), getEvents())
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
    const compare = buildCompareResponse(nullSignal, getAnalysts(), getEvents())
    const confidenceRow = compare.attributes.find((a) => a.attribute === 'Confidence')!
    expect(confidenceRow.before).toBe('Unavailable')
    expect(confidenceRow.after).toBe('Unavailable')
  })
})

describe('CompareService (Effect) via runApiEffect', () => {
  it('builds the compare payload for a known signal', async () => {
    const id = getSignals()[0].id
    const result = await runApiEffect(getCompareEffect(id))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.signalId).toBe(id)
  })

  it('maps an unknown signal to a 404 not_found envelope', async () => {
    const result = await runApiEffect(getCompareEffect('sig_nope'))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(404)
      expect(result.error.code).toBe('not_found')
    }
  })
})

describe('buildDxMetricsResponse / MetricsService', () => {
  it('falls back to seed data (3 variants, current=flow)', () => {
    const response = buildDxMetricsResponse()
    expect(response.source).toBe('seed')
    expect(response.current).toBe('flow')
    expect(response.metrics).toHaveLength(3)
  })

  it('serves the same payload through the Effect service', async () => {
    const result = await runApiEffect(getDxMetricsEffect())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.source).toBe('seed')
      expect(result.value.current).toBe('flow')
    }
  })
})

describe('HealthService', () => {
  it('reports ok with the Flow variant label (pure)', () => {
    const health = buildHealthResponse()
    expect(health.status).toBe('ok')
    expect(health.variant).toBe('Variant B — Flow')
  })

  it('reports ok through the Effect service', async () => {
    const result = await runApiEffect(getHealthEffect())
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.status).toBe('ok')
  })
})
