import type { FlowLogLevel } from './types'

/**
 * Map Flow levels to the OpenTelemetry SeverityNumber scale (DEBUG 5-8, INFO 9-12, WARN 13-16,
 * ERROR 17-20, FATAL 21-24). We pick the low end of each band so the numbers stay stable and
 * comparable without pulling in any OTel SDK.
 */
const TO_NUMBER: Record<FlowLogLevel, number> = {
  debug: 5,
  info: 9,
  warn: 13,
  error: 17,
  fatal: 21
}

const ORDER: Record<FlowLogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4
}

export function levelToSeverityNumber(level: FlowLogLevel): number {
  return TO_NUMBER[level]
}

export function severityNumberToLevel(value: number): FlowLogLevel {
  if (value >= 21) return 'fatal'
  if (value >= 17) return 'error'
  if (value >= 13) return 'warn'
  if (value >= 9) return 'info'
  return 'debug'
}

export function meetsMinLevel(level: FlowLogLevel, min: FlowLogLevel): boolean {
  return ORDER[level] >= ORDER[min]
}
