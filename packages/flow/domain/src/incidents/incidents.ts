import type { Incident, IncidentImpact, IncidentStatus } from '@signalops/contracts'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/** Human label for an incident status (`in_progress` → `In progress`). */
export function formatIncidentStatus(status: IncidentStatus): string {
  switch (status) {
    case 'open':
      return 'Open'
    case 'in_progress':
      return 'In progress'
    case 'resolved':
      return 'Resolved'
  }
}

/** Human label for an incident impact (`security` → `Security`). */
export function formatImpact(impact: IncidentImpact): string {
  return impact.charAt(0).toUpperCase() + impact.slice(1)
}

/** An incident is active until it is resolved. */
export function isActiveIncident(incident: Incident): boolean {
  return incident.status !== 'resolved'
}

export type IncidentSummary = {
  active: number
  critical: number
  /** Average resolution time in ms over resolved incidents (0 when none are resolved). */
  avgResolutionTimeMs: number
  /** Incidents resolved within the last 7 days of `now`. */
  resolvedThisWeek: number
}

/** The four numbers behind the Incidents summary cards. */
export function computeIncidentSummary(
  incidents: readonly Incident[],
  now: number
): IncidentSummary {
  let active = 0
  let critical = 0
  let resolvedThisWeek = 0
  let resolvedCount = 0
  let resolvedTotalMs = 0

  for (const incident of incidents) {
    if (isActiveIncident(incident)) {
      active++
      if (incident.severity === 'critical') critical++
    }
    if (incident.status === 'resolved' && incident.resolvedAt) {
      const resolvedMs = Date.parse(incident.resolvedAt)
      const delta = resolvedMs - Date.parse(incident.createdAt)
      if (Number.isFinite(delta) && delta > 0) {
        resolvedTotalMs += delta
        resolvedCount++
      }
      if (now - resolvedMs <= WEEK_MS) resolvedThisWeek++
    }
  }

  return {
    active,
    critical,
    avgResolutionTimeMs: resolvedCount === 0 ? 0 : Math.round(resolvedTotalMs / resolvedCount),
    resolvedThisWeek
  }
}
