import type {
  Incident,
  SeverityBreakdownEntry,
  Signal,
  SignalSeverity,
  TimeseriesPoint
} from '@signalops/contracts'
import { SIGNAL_SEVERITIES } from '@signalops/contracts'
import { severityRank } from '../signals/severity'
import { isOpenStatus } from '../signals/status'

/** The four headline numbers behind the Overview KPI cards. */
export type DashboardKpiValues = {
  openSignals: number
  criticalSignals: number
  activeIncidents: number
  /** Average qualification time in ms (time from creation to last update for triaged+ signals). */
  avgQualificationTimeMs: number
}

/** A signal is counted as critical-on-the-board when it is critical severity AND still open. */
function isOpenCritical(signal: Signal): boolean {
  return signal.severity === 'critical' && isOpenStatus(signal.status)
}

export function computeKpiValues(
  signals: readonly Signal[],
  incidents: readonly Incident[]
): DashboardKpiValues {
  let openSignals = 0
  let criticalSignals = 0
  let qualifiedCount = 0
  let qualifiedTotalMs = 0

  for (const signal of signals) {
    if (isOpenStatus(signal.status)) openSignals++
    if (isOpenCritical(signal)) criticalSignals++
    // Qualification time proxy: signals that moved past "new" carry a created→updated delta.
    if (signal.status !== 'new') {
      const delta = Date.parse(signal.updatedAt) - Date.parse(signal.createdAt)
      if (Number.isFinite(delta) && delta > 0) {
        qualifiedTotalMs += delta
        qualifiedCount++
      }
    }
  }

  const activeIncidents = incidents.filter((incident) => incident.status !== 'resolved').length
  const avgQualificationTimeMs =
    qualifiedCount === 0 ? 0 : Math.round(qualifiedTotalMs / qualifiedCount)

  return { openSignals, criticalSignals, activeIncidents, avgQualificationTimeMs }
}

/**
 * Count of OPEN signals per severity, ordered most-severe first (Critical → Low) to match the
 * "Signals by severity" bars.
 */
export function computeSeverityBreakdown(signals: readonly Signal[]): SeverityBreakdownEntry[] {
  const counts = new Map<SignalSeverity, number>(SIGNAL_SEVERITIES.map((s) => [s, 0]))
  for (const signal of signals) {
    if (isOpenStatus(signal.status))
      counts.set(signal.severity, (counts.get(signal.severity) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([severity, count]) => ({ severity, count }))
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
}

/** The N highest-risk open critical/high signals, for the "Most critical signals" list. */
export function selectMostCritical(signals: readonly Signal[], limit = 8): Signal[] {
  return signals
    .filter((s) => isOpenStatus(s.status) && (s.severity === 'critical' || s.severity === 'high'))
    .sort(
      (a, b) =>
        b.riskScore - a.riskScore ||
        severityRank(b.severity) - severityRank(a.severity) ||
        (a.id < b.id ? -1 : 1)
    )
    .slice(0, limit)
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Daily counts of signals created in the trailing `days` window ending at `now`, with the
 * critical subset, oldest day first. Drives the "Signals over time" area+line chart.
 */
export function computeSignalsOverTime(
  signals: readonly Signal[],
  now: number,
  days = 14
): TimeseriesPoint[] {
  const buckets = new Map<string, { total: number; critical: number }>()
  const startDay = startOfUtcDay(now - (days - 1) * DAY_MS)

  for (let i = 0; i < days; i++) {
    buckets.set(toDateKey(startDay + i * DAY_MS), { total: 0, critical: 0 })
  }

  for (const signal of signals) {
    const key = toDateKey(Date.parse(signal.createdAt))
    const bucket = buckets.get(key)
    if (bucket) {
      bucket.total++
      if (signal.severity === 'critical') bucket.critical++
    }
  }

  return [...buckets.entries()].map(([date, { total, critical }]) => ({ date, total, critical }))
}

function startOfUtcDay(ms: number): number {
  return Math.floor(ms / DAY_MS) * DAY_MS
}

function toDateKey(ms: number): string {
  return new Date(startOfUtcDay(ms)).toISOString().slice(0, 10)
}
