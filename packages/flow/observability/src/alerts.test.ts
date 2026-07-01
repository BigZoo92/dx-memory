import { describe, expect, it } from 'vitest'
import { evaluateAlerts } from './alerts'
import { FLOW_VARIANT, type FlowLogEvent } from './types'

const at = (ms: number, over: Partial<FlowLogEvent>): FlowLogEvent => ({
  id: `e${ms}`,
  timestamp: new Date(ms).toISOString(),
  level: 'error',
  runtime: 'server',
  variant: FLOW_VARIANT,
  message: 'm',
  ...over
})

describe('alerts', () => {
  const now = 1_000_000

  it('fires spike-500 once the threshold is reached', () => {
    const events = [
      at(now - 1000, { status: 500 }),
      at(now - 2000, { status: 500 }),
      at(now - 3000, { status: 500 })
    ]
    const spike = evaluateAlerts(events, now).find((a) => a.ruleId === 'spike-500')
    expect(spike?.count).toBe(3)
    expect(spike?.severity).toBe('critical')
  })

  it('ignores events outside the window', () => {
    const events = [
      at(now - 1000, { status: 500 }),
      at(now - 90_000, { status: 500 }),
      at(now - 95_000, { status: 500 })
    ]
    expect(evaluateAlerts(events, now).find((a) => a.ruleId === 'spike-500')).toBeUndefined()
  })

  it('flags a single forced demo error as demo-only', () => {
    const alerts = evaluateAlerts([at(now - 500, { errorCode: 'simulated_error' })], now)
    expect(alerts.find((a) => a.ruleId === 'forced-demo')?.severity).toBe('demo-only')
  })
})
