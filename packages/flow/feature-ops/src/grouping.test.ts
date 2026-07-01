import { describe, expect, it } from 'vitest'
import { FLOW_VARIANT, type FlowLogEvent } from '@signalops/flow-observability'
import { toInboxRows } from './grouping'

const event = (over: Partial<FlowLogEvent>): FlowLogEvent => ({
  id: Math.random().toString(36),
  timestamp: new Date().toISOString(),
  level: 'error',
  runtime: 'server',
  variant: FLOW_VARIANT,
  message: 'm',
  ...over
})

describe('toInboxRows', () => {
  it('drops info/debug and keeps warn/error/fatal', () => {
    const rows = toInboxRows([
      event({ level: 'info', message: 'ok' }),
      event({ level: 'error', message: 'boom' })
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0].message).toBe('boom')
  })

  it('groups identical signatures into one row with a count and a window', () => {
    const rows = toInboxRows([
      event({ message: 'boom', route: '/api/signals', status: 500, timestamp: '2026-01-01T00:00:00.000Z' }),
      event({ message: 'boom', route: '/api/signals', status: 500, timestamp: '2026-01-01T00:01:00.000Z' })
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0].count).toBe(2)
    expect(rows[0].firstAt).toBe('2026-01-01T00:00:00.000Z')
    expect(rows[0].lastAt).toBe('2026-01-01T00:01:00.000Z')
  })
})
