import { describe, expect, it } from 'vitest'
import { buildDiagnosticPack } from './diagnostic-pack'
import { computeRunCounters } from './run-counters'
import { FLOW_VARIANT, type FlowLogEvent } from './types'

const event = (i: number): FlowLogEvent => ({
  id: `e${i}`,
  timestamp: new Date().toISOString(),
  level: 'info',
  runtime: 'server',
  variant: FLOW_VARIANT,
  message: `Bearer secret-${i}-${'z'.repeat(50)}`
})

describe('diagnostic pack', () => {
  it('caps logs at the last 20 and re-redacts them', () => {
    const logs = Array.from({ length: 30 }, (_, i) => event(i))
    const pack = buildDiagnosticPack({
      appVersion: '0.0.0',
      counters: computeRunCounters(logs),
      logs,
      breadcrumbs: []
    })
    expect(pack.logs.length).toBe(20)
    expect(pack.logs[0].message).toContain('[redacted]')
    expect(pack.variant).toBe(FLOW_VARIANT)
    expect(pack.health).toBeNull()
    expect(pack.notes.length).toBeGreaterThan(0)
  })
})
