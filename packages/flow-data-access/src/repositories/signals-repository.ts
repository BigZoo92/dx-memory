import {
  DEFAULT_PAGE_SIZE,
  type Paginated,
  type Signal,
  type SignalDetailResponse,
  type SignalsQuery,
  type TimelineEvent
} from '@signalops/contracts'
import { filterSignals, sortSignals } from '@signalops/flow-domain'
import { getEvents, getIncidents, getSignals } from '../fixtures/dataset'
import { notFound } from '../api-errors/api-error'

/**
 * Query signals: filter → stable sort → paginate. Default ordering is risk score descending
 * ("sorted by risk score" in the UI). Filtering and sorting are delegated to `@signalops/flow-domain`
 * so the API and any client compute them identically; only pagination lives here.
 */
export function querySignals(
  query: SignalsQuery,
  source: readonly Signal[] = getSignals()
): Paginated<Signal> {
  const filtered = filterSignals(source, query)
  const sorted = sortSignals(filtered, query.sortBy ?? 'riskScore', query.sortDirection ?? 'desc')

  const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE
  const total = sorted.length
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize)
  // Clamp the requested page into range so pagination is always stable, never out-of-bounds.
  const page = Math.min(Math.max(1, query.page ?? 1), Math.max(1, totalPages))
  const start = (page - 1) * pageSize
  const items = sorted.slice(start, start + pageSize)

  return { items, page, pageSize, total, totalPages }
}

/** Full signal record + its linked incident (or `null`). Throws a typed 404 when missing. */
export function getSignalById(id: string): SignalDetailResponse {
  const signal = getSignals().find((s) => s.id === id)
  if (!signal) throw notFound(`Signal not found: ${id}`)
  const linkedIncident =
    getIncidents().find((incident) => incident.linkedSignalIds.includes(id)) ?? null
  return { signal, linkedIncident }
}

/** A signal's timeline events, oldest first. Throws a typed 404 when the signal is missing. */
export function getSignalEvents(id: string): TimelineEvent[] {
  const exists = getSignals().some((s) => s.id === id)
  if (!exists) throw notFound(`Signal not found: ${id}`)
  return getEvents()
    .filter((event) => event.signalId === id)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0))
}
