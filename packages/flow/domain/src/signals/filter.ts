import type { RiskTrend, Signal, SignalsQuery } from '@signalops/contracts'

/** Sentinel `assignedTo` value meaning "no analyst assigned" (mirrors the UI's "Unassigned"). */
export const UNASSIGNED = 'unassigned'

/**
 * Flow's signals query. The shared `SignalsQuery` contract is frozen across variants, so the
 * risk-trend filter (the cross-variant "cost of change" capability) is a Flow-local extension.
 */
export type FlowSignalsQuery = SignalsQuery & { riskTrend?: RiskTrend }

/**
 * Pure predicate: does a signal match every active filter in the query? Filters are
 * **combinable** (AND semantics) — each clause narrows the set independently, exactly as the
 * Signals Explorer filter bar behaves. Absent/empty filters are ignored.
 */
export function matchesSignalFilters(signal: Signal, query: FlowSignalsQuery): boolean {
  if (query.severity && signal.severity !== query.severity) return false
  if (query.status && signal.status !== query.status) return false
  if (query.source && signal.source !== query.source) return false
  if (query.riskTrend && signal.riskTrend !== query.riskTrend) return false

  if (query.assignedTo) {
    if (query.assignedTo === UNASSIGNED) {
      if (signal.assignedTo !== null) return false
    } else if (signal.assignedTo !== query.assignedTo) {
      return false
    }
  }

  // ISO-8601 strings compare correctly with lexicographic <=, so we avoid Date parsing.
  if (query.dateFrom && signal.createdAt < query.dateFrom) return false
  if (query.dateTo && signal.createdAt > query.dateTo) return false

  if (query.search) {
    const needle = query.search.trim().toLowerCase()
    if (needle.length > 0) {
      const haystack = [signal.title, signal.id, signal.source, signal.assignedTo ?? '']
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(needle)) return false
    }
  }

  return true
}

/** Apply all query filters to a list of signals, preserving input order. */
export function filterSignals(signals: readonly Signal[], query: FlowSignalsQuery): Signal[] {
  return signals.filter((signal) => matchesSignalFilters(signal, query))
}
