import type { SignalSeverity } from '@signalops/contracts'

/**
 * Severity ordering, most-severe first. This is the single source of truth for "how bad"
 * a signal is, used by sorting and by the dashboard distribution. Keeping it here (pure,
 * framework-free) means the table, the charts and the API all rank severity identically.
 */
export const SEVERITY_RANK: Record<SignalSeverity, number> = {
  critical: 3,
  high: 2,
  medium: 1,
  low: 0
}

/** Numeric rank for a severity (critical = 3 … low = 0). */
export function severityRank(severity: SignalSeverity): number {
  return SEVERITY_RANK[severity]
}

/**
 * Comparator for severity, descending by default (critical first). Returns a negative
 * number when `a` is more severe than `b`, mirroring `Array.prototype.sort` semantics for
 * a descending order.
 */
export function compareSeverityDesc(a: SignalSeverity, b: SignalSeverity): number {
  return severityRank(b) - severityRank(a)
}

/** Human label for a severity (`critical` → `Critical`). */
export function formatSeverity(severity: SignalSeverity): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1)
}
