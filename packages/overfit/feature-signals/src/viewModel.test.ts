import { describe, expect, it } from 'vitest'
import { RISK_TRENDS, toSignalRow } from './viewModel'
import type { Signal } from '@signalops/overfit-contracts-generated'

const base: Signal = {
  id: 'sig_00001',
  title: 'Partner API latency spike',
  description: 'd',
  severity: 'high',
  status: 'triaged',
  source: 'partner',
  confidence: null,
  riskScore: 84,
  riskTrend: 'up',
  region: 'EU-West',
  assignedTo: 'ana_002',
  createdAt: '2026-06-01T10:00:00.000Z',
  updatedAt: '2026-06-02T00:00:00.000Z',
  tags: ['partner-api'],
  hasLinkedIncident: true
}

describe('signals view model', () => {
  it('maps risk trend to a readable label', () => {
    expect(toSignalRow(base).riskTrendLabel).toBe('Rising')
    expect(toSignalRow({ ...base, riskTrend: 'down' }).riskTrendLabel).toBe('Falling')
  })

  it('handles missing confidence', () => {
    const vm = toSignalRow(base)
    expect(vm.confidenceAvailable).toBe(false)
    expect(vm.confidenceLabel).toBe('Unavailable')
  })

  it('exposes the three risk-trend filter options', () => {
    expect(RISK_TRENDS.map((t) => t.value)).toEqual(['up', 'stable', 'down'])
  })
})
