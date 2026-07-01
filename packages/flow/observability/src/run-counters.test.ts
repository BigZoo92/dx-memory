import { describe, expect, it } from 'vitest'
import { computeRunCounters } from './run-counters'
import { FLOW_VARIANT, type FlowLogEvent } from './types'

const event = (over: Partial<FlowLogEvent>): FlowLogEvent => ({
  id: 'x',
  timestamp: new Date().toISOString(),
  level: 'info',
  runtime: 'server',
  variant: FLOW_VARIANT,
  message: 'm',
  ...over
})

describe('run counters', () => {
  it('separates handled and unhandled errors and tracks timeouts, retries and coverage', () => {
    const events = [
      event({ level: 'error', errorTag: 'FlowApiError', requestId: 'req_1' }),
      event({ level: 'error', errorCode: 'unhandled', runtime: 'client' }),
      event({ level: 'error', errorTag: 'FlowTimeoutError', requestId: 'req_2' }),
      event({ level: 'info', retryCount: 2, requestId: 'req_3' })
    ]
    const counters = computeRunCounters(events, 1)
    expect(counters.total).toBe(4)
    expect(counters.handledErrors).toBe(2)
    expect(counters.unhandledErrors).toBe(1)
    expect(counters.timeouts).toBe(1)
    expect(counters.retries).toBe(2)
    expect(counters.alertCount).toBe(1)
    expect(counters.requestIdCoverage).toBeCloseTo(3 / 4)
  })

  it('returns zero coverage for an empty window', () => {
    expect(computeRunCounters([]).requestIdCoverage).toBe(0)
  })
})
