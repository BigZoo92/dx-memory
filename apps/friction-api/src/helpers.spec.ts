import { describe, it, expect } from 'vitest'
import {
  formatSeverity,
  formatStatus,
  formatSource,
  confidenceLabel,
  deriveRiskTrend,
  formatDuration,
  severityRank,
  isOpenStatus,
  matchesSignal,
  querySignals,
  buildDashboard,
  buildCompare
} from './helpers'
import { getDataset } from './dataset'
import type { Signal } from './types'

const base: Signal = {
  id: 'sig_00001',
  title: 'Test',
  description: 'x',
  severity: 'high',
  status: 'new',
  source: 'api',
  confidence: 0.5,
  riskScore: 60,
  region: 'EU-West',
  assignedTo: null,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-02T00:00:00.000Z',
  tags: ['auth'],
  hasLinkedIncident: false
}

describe('formatters', () => {
  it('severity capitalizes', () => {
    expect(formatSeverity('critical')).toBe('Critical')
  })
  it('status capitalizes', () => {
    expect(formatStatus('investigating')).toBe('Investigating')
  })
  it('source api -> API', () => {
    expect(formatSource('api')).toBe('API')
  })
  it('source web -> Web', () => {
    expect(formatSource('web')).toBe('Web')
  })
})

describe('confidenceLabel', () => {
  it('null is Unavailable', () => {
    expect(confidenceLabel(null)).toBe('Unavailable')
  })
  it('0.9 is High', () => {
    expect(confidenceLabel(0.9)).toBe('High')
  })
  it('0.5 is Medium', () => {
    expect(confidenceLabel(0.5)).toBe('Medium')
  })
  it('0.1 is Low', () => {
    expect(confidenceLabel(0.1)).toBe('Low')
  })
})

describe('deriveRiskTrend', () => {
  it('80 is up', () => {
    expect(deriveRiskTrend(80)).toBe('up')
  })
  it('100 is up', () => {
    expect(deriveRiskTrend(100)).toBe('up')
  })
  it('79 is stable', () => {
    expect(deriveRiskTrend(79)).toBe('stable')
  })
  it('36 is stable', () => {
    expect(deriveRiskTrend(36)).toBe('stable')
  })
  it('35 is down', () => {
    expect(deriveRiskTrend(35)).toBe('down')
  })
  it('0 is down', () => {
    expect(deriveRiskTrend(0)).toBe('down')
  })
})

describe('formatDuration', () => {
  it('zero', () => {
    expect(formatDuration(0)).toBe('0m')
  })
  it('minutes', () => {
    expect(formatDuration(5 * 60000)).toBe('5m')
  })
  it('hours', () => {
    expect(formatDuration(3 * 3600000)).toBe('3h')
  })
})

describe('severityRank', () => {
  it('critical > low', () => {
    expect(severityRank('critical')).toBeGreaterThan(severityRank('low'))
  })
})

describe('isOpenStatus', () => {
  it('new is open', () => {
    expect(isOpenStatus('new')).toBe(true)
  })
  it('resolved is closed', () => {
    expect(isOpenStatus('resolved')).toBe(false)
  })
})

describe('matchesSignal', () => {
  it('matches by severity', () => {
    expect(matchesSignal(base, { severity: 'high' })).toBe(true)
  })
  it('rejects other severity', () => {
    expect(matchesSignal(base, { severity: 'low' })).toBe(false)
  })
  it('matches by search on title', () => {
    expect(matchesSignal(base, { search: 'test' })).toBe(true)
  })
  it('matches by risk trend', () => {
    expect(matchesSignal({ ...base, riskTrend: 'stable' }, { riskTrend: 'stable' })).toBe(true)
  })
  it('rejects other risk trend', () => {
    expect(matchesSignal({ ...base, riskTrend: 'stable' }, { riskTrend: 'up' })).toBe(false)
  })
})

describe('querySignals', () => {
  const d = getDataset()
  it('returns a page', () => {
    const r = querySignals(d.signals, { pageSize: 10 })
    expect(r.items.length).toBe(10)
  })
  it('reports total', () => {
    const r = querySignals(d.signals, {})
    expect(r.total).toBe(10000)
  })
  it('filters critical', () => {
    const r = querySignals(d.signals, { severity: 'critical' })
    expect(r.items.every((s) => s.severity === 'critical')).toBe(true)
  })
  it('filters by risk trend', () => {
    const r = querySignals(d.signals, { riskTrend: 'down' })
    expect(r.total).toBeGreaterThan(0)
    expect(r.items.every((s) => s.riskTrend === 'down')).toBe(true)
  })
  it('default sort is risk desc', () => {
    const r = querySignals(d.signals, { pageSize: 5 })
    for (let i = 1; i < r.items.length; i++) {
      expect(r.items[i - 1].riskScore).toBeGreaterThanOrEqual(r.items[i].riskScore)
    }
  })
})

describe('buildDashboard', () => {
  const d = getDataset()
  const dash = buildDashboard(d.signals, d.incidents)
  it('has 4 kpis', () => {
    expect(Object.keys(dash.kpis).length).toBe(4)
  })
  it('severity breakdown has 4 rows', () => {
    expect(dash.severityBreakdown.length).toBe(4)
  })
  it('timeseries has 14 points', () => {
    expect(dash.signalsOverTime.length).toBe(14)
  })
  it('most critical is at most 8', () => {
    expect(dash.mostCriticalSignals.length).toBeLessThanOrEqual(8)
  })
})

describe('buildCompare', () => {
  const d = getDataset()
  const cmp = buildCompare(d.signals[0], d.analysts, d.events)
  it('has 6 attributes', () => {
    expect(cmp.attributes.length).toBe(6)
  })
  it('has an impact sentence', () => {
    expect(cmp.impactSentence.length).toBeGreaterThan(0)
  })
  it('timeline is at most 6', () => {
    expect(cmp.timeline.length).toBeLessThanOrEqual(6)
  })
})
