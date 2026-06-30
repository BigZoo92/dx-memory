import type { Signal, SignalSortField, SortDirection } from '@signalops/contracts'
import { severityRank } from './severity'

/**
 * Comparable primitive for each sort field. `confidence` can be `null`; we sort nulls as the
 * lowest possible value so "Unavailable" rows always sink to the bottom of a descending sort
 * (and float to the top ascending) — deterministic either way.
 */
function sortValue(signal: Signal, field: SignalSortField): number | string {
  switch (field) {
    case 'createdAt':
      return signal.createdAt
    case 'riskScore':
      return signal.riskScore
    case 'confidence':
      return signal.confidence ?? -1
    case 'severity':
      return severityRank(signal.severity)
  }
}

/**
 * Stable, deterministic sort. JS `Array.sort` is stable, but we add an explicit tiebreaker on
 * the unique `id` so equal keys never reorder across calls or pages — a hard requirement for
 * stable pagination over 10,000 rows.
 */
export function sortSignals(
  signals: readonly Signal[],
  field: SignalSortField,
  direction: SortDirection
): Signal[] {
  const factor = direction === 'asc' ? 1 : -1
  return [...signals].sort((a, b) => {
    const va = sortValue(a, field)
    const vb = sortValue(b, field)
    if (va < vb) return -1 * factor
    if (va > vb) return 1 * factor
    // Tiebreaker: stable, id-based ordering independent of direction.
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })
}
