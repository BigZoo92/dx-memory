import { Context, Effect, Layer } from 'effect'
import {
  DEFAULT_PAGE_SIZE,
  type Incident,
  type IncidentsQuery,
  type Paginated
} from '@signalops/contracts'
import { Dataset } from '../effect/dataset'

/** Filter predicate for incidents (status / severity / impact), AND semantics. */
function matchesIncidentFilters(incident: Incident, query: IncidentsQuery): boolean {
  if (query.status && incident.status !== query.status) return false
  if (query.severity && incident.severity !== query.severity) return false
  if (query.impact && incident.impact !== query.impact) return false
  return true
}

/**
 * Query incidents: filter → stable sort (newest first, id tiebreaker) → paginate. Pure and total,
 * so it stays a plain function — only the data source (the `Dataset` service) is injected.
 */
export function queryIncidents(
  query: IncidentsQuery,
  source: readonly Incident[]
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

export interface IncidentsRepositoryService {
  readonly query: (query: IncidentsQuery) => Effect.Effect<Paginated<Incident>>
}

export class IncidentsRepository extends Context.Tag('@signalops/flow/IncidentsRepository')<
  IncidentsRepository,
  IncidentsRepositoryService
>() {}

export const IncidentsRepositoryLive = Layer.effect(
  IncidentsRepository,
  Effect.gen(function* () {
    const dataset = yield* Dataset
    return IncidentsRepository.of({
      query: (query) =>
        Effect.map(dataset.incidents, (incidents) => queryIncidents(query, incidents))
    })
  })
)
