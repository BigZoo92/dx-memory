import { describe, expect, it } from 'vitest'
import { assertPaginatedSignals, ContractViolation, isSignal } from './runtime'
import type { Signal } from './index'

const good: Signal = {
  id: 'sig_00001',
  title: 'Unusual authentication pattern detected',
  description: 'd',
  severity: 'critical',
  status: 'new',
  source: 'partner',
  confidence: 0.8,
  riskScore: 91,
  riskTrend: 'up',
  region: 'EU-West',
  assignedTo: null,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-02T00:00:00.000Z',
  tags: ['auth'],
  hasLinkedIncident: false
}

describe('contracts-generated runtime', () => {
  it('accepts a valid signal', () => {
    expect(isSignal(good)).toBe(true)
  })

  it('rejects an invalid trend', () => {
    expect(isSignal({ ...good, riskTrend: 'sideways' })).toBe(false)
  })

  it('asserts a paginated payload', () => {
    const page = { items: [good], page: 1, pageSize: 50, total: 1, totalPages: 1 }
    expect(assertPaginatedSignals(page).items).toHaveLength(1)
  })

  it('throws ContractViolation on a bad row', () => {
    const page = { items: [{ nope: true }], page: 1, pageSize: 50, total: 1, totalPages: 1 }
    expect(() => assertPaginatedSignals(page)).toThrow(ContractViolation)
  })
})
