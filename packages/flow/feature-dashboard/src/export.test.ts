import { describe, expect, it } from 'vitest'
import type { DashboardSummary } from '@signalops/contracts'
import { dashboardToJson } from './export'

const summary = {
  kpis: {
    openSignals: { label: 'Open signals', value: 1234, trend: 'up', trendLabel: '+5%' },
    criticalSignals: { label: 'Critical', value: 42, trend: 'down', trendLabel: '-2%' },
    activeIncidents: { label: 'Active incidents', value: 12, trend: 'stable', trendLabel: '0%' },
    avgQualificationTimeMs: {
      label: 'Avg qualification',
      value: 3600000,
      trend: 'down',
      trendLabel: '-3m',
      display: '1h'
    }
  },
  mostCriticalSignals: [
    {
      id: 'sig_1',
      title: 'Unusual auth pattern',
      severity: 'critical',
      source: 'web',
      riskScore: 97
    }
  ],
  recentIncidents: [
    { id: 'inc_1', title: 'Partner API latency spike', severity: 'high', owner: 'analyst-002' }
  ]
} as unknown as DashboardSummary

describe('dashboardToJson', () => {
  it('exports KPIs, most-critical signals and recent incidents as JSON', () => {
    const parsed = JSON.parse(dashboardToJson(summary))
    expect(parsed.kpis.openSignals.value).toBe(1234)
    expect(parsed.mostCriticalSignals).toEqual([
      {
        id: 'sig_1',
        title: 'Unusual auth pattern',
        severity: 'critical',
        source: 'web',
        riskScore: 97
      }
    ])
    expect(parsed.recentIncidents[0]).toMatchObject({ id: 'inc_1', owner: 'analyst-002' })
  })
})
