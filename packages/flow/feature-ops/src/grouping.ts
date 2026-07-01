import type { FlowLogEvent } from '@signalops/flow-observability'
import type { OpsLogRow } from '@signalops/flow-ui'

const SIGNIFICANT = new Set<FlowLogEvent['level']>(['warn', 'error', 'fatal'])

/**
 * Collapse the warn/error/fatal events into inbox rows, grouped by a stable signature
 * (errorTag + route + status + message) so a repeated failure shows as one row with a count and a
 * first/last-seen window. Most recent first.
 */
export function toInboxRows(events: readonly FlowLogEvent[]): OpsLogRow[] {
  const groups = new Map<string, OpsLogRow>()
  for (const event of events) {
    if (!SIGNIFICANT.has(event.level)) continue
    const key = `${event.errorTag ?? '-'}|${event.route ?? '-'}|${event.status ?? '-'}|${event.message}`
    const existing = groups.get(key)
    if (existing) {
      existing.count += 1
      if (event.timestamp > existing.lastAt) {
        existing.lastAt = event.timestamp
        existing.requestId = event.requestId ?? existing.requestId
      }
      if (event.timestamp < existing.firstAt) existing.firstAt = event.timestamp
    } else {
      groups.set(key, {
        id: key,
        level: event.level,
        message: event.message,
        route: event.route,
        method: event.method,
        status: event.status,
        errorTag: event.errorTag,
        requestId: event.requestId,
        count: 1,
        firstAt: event.timestamp,
        lastAt: event.timestamp
      })
    }
  }
  return [...groups.values()].sort((a, b) => b.lastAt.localeCompare(a.lastAt))
}
