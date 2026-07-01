import type { FlowAlert, FlowAlertRuleId, FlowAlertSeverity, FlowLogEvent } from './types'

/**
 * A window-based alert rule. Evaluation is event-driven and pure (no timers): pass a snapshot of
 * events plus the current time. The deterministic `alert_<ruleId>` id makes dedup free across
 * re-evaluations, which keeps the Ops panel quiet (one active alert per rule).
 */
export type AlertRule = {
  id: FlowAlertRuleId
  severity: FlowAlertSeverity
  title: string
  windowMs: number
  threshold: number
  match(event: FlowLogEvent): boolean
  message(count: number): string
}

export const DEFAULT_ALERT_RULES: readonly AlertRule[] = [
  {
    id: 'spike-500',
    severity: 'critical',
    title: 'Spike of 500 responses',
    windowMs: 60_000,
    threshold: 3,
    match: (event) => event.status === 500,
    message: (count) => `${count} server errors (500) in the last minute`
  },
  {
    id: 'timeouts',
    severity: 'warning',
    title: 'Repeated request timeouts',
    windowMs: 60_000,
    threshold: 3,
    match: (event) => event.errorTag === 'FlowTimeoutError' || event.errorCode === 'timeout',
    message: (count) => `${count} request timeouts in the last minute`
  },
  {
    id: 'validation-repeated',
    severity: 'warning',
    title: 'Repeated validation failures',
    windowMs: 120_000,
    threshold: 5,
    match: (event) =>
      event.errorTag === 'FlowValidationError' || event.errorCode === 'bad_request',
    message: (count) => `${count} validation failures in the last two minutes`
  },
  {
    id: 'product-impact-signals',
    severity: 'product-impact',
    title: 'Signals route failing',
    windowMs: 60_000,
    threshold: 1,
    match: (event) =>
      (event.level === 'error' || event.level === 'fatal') &&
      (event.route?.includes('/signals') ?? false),
    message: (count) => `The signals route failed ${count} time(s) recently`
  },
  {
    id: 'client-unhandled',
    severity: 'critical',
    title: 'Unhandled client error',
    windowMs: 60_000,
    threshold: 1,
    match: (event) =>
      event.runtime === 'client' &&
      (event.errorTag === 'unhandled' || event.errorCode === 'unhandled'),
    message: (count) => `${count} unhandled client error(s) captured`
  },
  {
    id: 'forced-demo',
    severity: 'demo-only',
    title: 'Forced demo error active',
    windowMs: 60_000,
    threshold: 1,
    match: (event) => event.errorCode === 'simulated_error',
    message: (count) => `Forced demo error triggered ${count} time(s)`
  }
]

export function evaluateAlerts(
  events: readonly FlowLogEvent[],
  nowMs: number,
  rules: readonly AlertRule[] = DEFAULT_ALERT_RULES
): FlowAlert[] {
  const alerts: FlowAlert[] = []
  for (const rule of rules) {
    const since = nowMs - rule.windowMs
    const matched = events.filter((event) => {
      const time = Date.parse(event.timestamp)
      return !Number.isNaN(time) && time >= since && rule.match(event)
    })
    if (matched.length < rule.threshold) continue
    const times = matched.map((event) => event.timestamp).sort()
    alerts.push({
      id: `alert_${rule.id}`,
      ruleId: rule.id,
      severity: rule.severity,
      title: rule.title,
      message: rule.message(matched.length),
      count: matched.length,
      firstAt: times[0],
      lastAt: times[times.length - 1]
    })
  }
  return alerts
}
