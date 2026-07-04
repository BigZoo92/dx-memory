import type { FlowLogEvent, RunCounters } from './types'

/**
 * Derive the operational Run counters from a window of events. Pure and cheap so the /dx-metrics Run
 * section and the Ops summary can recompute it on every render from the in-memory store.
 */
export function computeRunCounters(events: readonly FlowLogEvent[], alertCount = 0): RunCounters {
  const total = events.length
  let handledErrors = 0
  let unhandledErrors = 0
  let timeouts = 0
  let retries = 0
  let withRequestId = 0

  for (const event of events) {
    if (event.requestId) withRequestId += 1
    if (typeof event.retryCount === 'number') retries += event.retryCount
    if (event.errorTag === 'FlowTimeoutError' || event.errorCode === 'timeout') timeouts += 1
    const isError = event.level === 'error' || event.level === 'fatal'
    if (!isError) continue
    if (event.errorTag === 'unhandled' || event.errorCode === 'unhandled') unhandledErrors += 1
    else handledErrors += 1
  }

  return {
    total,
    handledErrors,
    unhandledErrors,
    timeouts,
    retries,
    requestIdCoverage: total === 0 ? 0 : withRequestId / total,
    alertCount
  }
}
