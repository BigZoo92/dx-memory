import type { FlowBreadcrumb, FlowLogEvent } from './types'

/**
 * Redaction is the safety floor of this package: nothing is stored or exported without passing
 * through here. It strips by key (anything that looks like a credential / prompt / PII field), by
 * value (bearer tokens, JWT-like strings, long opaque tokens), and bounds string length and object
 * depth so a stray fixture dump can never balloon a log event.
 */

export const REDACTED = '[redacted]'

const MAX_STRING = 2000
const MAX_DEPTH = 4

const SENSITIVE_KEY =
  /(authorization|cookie|set-cookie|x-api-key|api[-_]?key|token|secret|password|passwd|credential|session|prompt|email)/i

const SENSITIVE_VALUE: RegExp[] = [
  /Bearer\s+[A-Za-z0-9._-]+/gi,
  /eyJ[A-Za-z0-9._-]{10,}/g,
  /\b[A-Za-z0-9]{40,}\b/g
]

export function redactString(input: string): string {
  let out = input
  for (const re of SENSITIVE_VALUE) out = out.replace(re, REDACTED)
  return out.length > MAX_STRING ? `${out.slice(0, MAX_STRING)}...[truncated]` : out
}

function redactValue(value: unknown, depth: number): unknown {
  if (value === null || value === undefined) return value
  if (typeof value === 'string') return redactString(value)
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'function') return undefined
  if (depth >= MAX_DEPTH) return '[depth-limit]'
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redactValue(item, depth + 1))
  if (typeof value === 'object') return redactRecord(value as Record<string, unknown>, depth + 1)
  return String(value)
}

export function redactRecord(record: Record<string, unknown>, depth = 0): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(record)) {
    out[key] = SENSITIVE_KEY.test(key) ? REDACTED : redactValue(value, depth)
  }
  return out
}

function redactBreadcrumb(crumb: FlowBreadcrumb): FlowBreadcrumb {
  return {
    ...crumb,
    message: redactString(crumb.message),
    data: crumb.data ? redactRecord(crumb.data) : undefined
  }
}

/** Redact a fully-built event: message, safe context and any attached breadcrumbs. */
export function redactEvent(event: FlowLogEvent): FlowLogEvent {
  return {
    ...event,
    message: redactString(event.message),
    safeContext: event.safeContext ? redactRecord(event.safeContext) : undefined,
    breadcrumbs: event.breadcrumbs?.map(redactBreadcrumb)
  }
}
