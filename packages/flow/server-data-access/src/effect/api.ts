import { Effect } from 'effect'
import { SignalsRepository } from '../repositories/signals-repository'
import { IncidentsRepository } from '../repositories/incidents-repository'
import { DashboardService } from '../services/dashboard-service'
import { CompareService } from '../services/compare-service'
import { MetricsService, type MetricsOptions } from '../services/metrics-service'
import { HealthService } from '../services/health-service'
import { parseIncidentsQuery, parseSignalsQuery, type RawQuery } from '../query/parse'

/**
 * Route-facing effects — the API's public surface. Each composes parsing + a repository/service into
 * one program; a TanStack Start route only has to hand the result to `handleEffect`. They declare
 * their requirements (which services, the request context) in their types and stay free of any
 * layer-wiring or HTTP concern.
 */

export const getSignalsEffect = (input: RawQuery) =>
  Effect.gen(function* () {
    const query = yield* parseSignalsQuery(input)
    const repo = yield* SignalsRepository
    return yield* repo.query(query)
  })

export const getSignalByIdEffect = (id: string) =>
  Effect.flatMap(SignalsRepository, (repo) => repo.getById(id))

export const getSignalEventsEffect = (id: string) =>
  Effect.flatMap(SignalsRepository, (repo) => repo.getEvents(id))

export const getIncidentsEffect = (input: RawQuery) =>
  Effect.gen(function* () {
    const query = yield* parseIncidentsQuery(input)
    const repo = yield* IncidentsRepository
    return yield* repo.query(query)
  })

export const getDashboardSummaryEffect = () =>
  Effect.flatMap(DashboardService, (service) => service.build)

export const getCompareEffect = (id: string) =>
  Effect.flatMap(CompareService, (service) => service.build(id))

export const getDxMetricsEffect = (options?: MetricsOptions) =>
  Effect.flatMap(MetricsService, (service) => service.get(options))

export const getHealthEffect = () => Effect.flatMap(HealthService, (service) => service.build)
