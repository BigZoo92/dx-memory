import type { Incident } from '@signalops/contracts'

export type IncidentFilters = {
  status?: string
  severity?: string
  impact?: string
}

/** Pure client-side incident filter (empty string = "no filter on this field"). */
export function filterIncidents(incidents: Incident[], filters: IncidentFilters): Incident[] {
  return incidents.filter(
    (i) =>
      (!filters.status || i.status === filters.status) &&
      (!filters.severity || i.severity === filters.severity) &&
      (!filters.impact || i.impact === filters.impact)
  )
}
