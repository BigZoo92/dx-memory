import { Context, Effect, Layer } from 'effect'
import {
  DEFAULT_PAGE_SIZE,
  type Paginated,
  type Signal,
  type SignalDetailResponse,
  type TimelineEvent
} from '@signalops/contracts'
import { filterSignals, sortSignals, type FlowSignalsQuery } from '@signalops/flow-domain'
import { Dataset } from '../effect/dataset'
import { failNotFound } from '../effect/errors'
import type { RequestContext } from '../effect/request-context'
import type { FlowNotFoundError } from '@signalops/flow-effect'

/**
 * Query signals: filter → stable sort → paginate. Default ordering is risk score descending
 * ("sorted by risk score" in the UI). Pure and total — filtering/sorting are delegated to
 * `@signalops/flow-domain` so the API and any client compute them identically. This stays a plain
 * function (no Effect): wrapping deterministic, infallible compute in `Effect` would only add noise.
 */
export function querySignals(query: FlowSignalsQuery, source: readonly Signal[]): Paginated<Signal> {
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

const byCreatedAtAsc = (a: TimelineEvent, b: TimelineEvent): number =>
  a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0

/**
 * Signals repository as an injectable Effect service. The fallible operations (`getById`,
 * `getEvents`) fail with a typed {@link FlowNotFoundError}; the pure `query` cannot fail. All three
 * read their data from {@link Dataset}, so the same repository runs against live fixtures in
 * production and a hand-built dataset in tests.
 */
export interface SignalsRepositoryService {
  readonly query: (query: FlowSignalsQuery) => Effect.Effect<Paginated<Signal>>
  readonly getById: (
    id: string
  ) => Effect.Effect<SignalDetailResponse, FlowNotFoundError, RequestContext>
  readonly getEvents: (
    id: string
  ) => Effect.Effect<TimelineEvent[], FlowNotFoundError, RequestContext>
}

export class SignalsRepository extends Context.Tag('@signalops/flow/SignalsRepository')<
  SignalsRepository,
  SignalsRepositoryService
>() {}

export const SignalsRepositoryLive = Layer.effect(
  SignalsRepository,
  Effect.gen(function* () {
    const dataset = yield* Dataset
    return SignalsRepository.of({
      query: (query) => Effect.map(dataset.signals, (signals) => querySignals(query, signals)),

      getById: (id) =>
        Effect.gen(function* () {
          const signals = yield* dataset.signals
          const signal = signals.find((s) => s.id === id)
          if (!signal) return yield* failNotFound('Signal', id)
          const incidents = yield* dataset.incidents
          const linkedIncident =
            incidents.find((incident) => incident.linkedSignalIds.includes(id)) ?? null
          return { signal, linkedIncident }
        }),

      getEvents: (id) =>
        Effect.gen(function* () {
          const signals = yield* dataset.signals
          if (!signals.some((s) => s.id === id)) return yield* failNotFound('Signal', id)
          const events = yield* dataset.events
          return events.filter((event) => event.signalId === id).sort(byCreatedAtAsc)
        })
    })
  })
)
