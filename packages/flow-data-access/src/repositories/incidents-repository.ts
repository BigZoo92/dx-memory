import {
  DEFAULT_PAGE_SIZE,
  type Incident,
  type IncidentsQuery,
  type Paginated
} from '@signalops/contracts'
import { getIncidents } from '../fixtures/dataset'

/** Filter predicate for incidents (status / severity / impact), AND semantics. */
function matchesIncidentFilters(incident: Incident, query: IncidentsQuery): boolean {
  if (query.status && incident.status !== query.status) return false
  if (query.severity && incident.severity !== query.severity) return false
  if (query.impact && incident.impact !== query.impact) return false
  return true
}

/**
 * Query incidents: filter → stable sort (newest first, id tiebreaker) → paginate.
 * Simpler than the signals explorer, mirroring the product's Incidents screen.
 */
export function queryIncidents(
  query: IncidentsQuery,
  source: readonly Incident[] = getIncidents()
): Paginated<Incident> {
  const filtered = source.filter((incident) => matchesIncidentFilters(incident, query))
  const sorted = [...filtered].sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1
    return a.id < b.id ? -1 : 1
  })

  const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE
  const total = sorted.length
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize)
  const page = Math.min(Math.max(1, query.page ?? 1), Math.max(1, totalPages))
  const start = (page - 1) * pageSize
  const items = sorted.slice(start, start + pageSize)

  return { items, page, pageSize, total, totalPages }
}
