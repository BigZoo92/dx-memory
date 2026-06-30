import { Layer } from 'effect'
import type { Analyst, Incident, Signal, Source, TimelineEvent } from '@signalops/contracts'
import { DatasetLive, makeDatasetLayer } from './dataset'
import { SignalsRepository, SignalsRepositoryLive } from '../repositories/signals-repository'
import { IncidentsRepository, IncidentsRepositoryLive } from '../repositories/incidents-repository'
import { DashboardService, DashboardServiceLive } from '../services/dashboard-service'
import { CompareService, CompareServiceLive } from '../services/compare-service'
import { MetricsService, MetricsServiceLive } from '../services/metrics-service'
import { HealthService, HealthServiceLive } from '../services/health-service'
import type { RequestContext } from './request-context'

/** Every server service the route-facing effects can require. */
export type ServerServices =
  | SignalsRepository
  | IncidentsRepository
  | DashboardService
  | CompareService
  | MetricsService
  | HealthService

/**
 * The full server wiring. Repositories/services that need data depend on `Dataset`; composing them
 * with `Layer.provide(DatasetLive)` resolves that dependency internally, so `ServerLive` requires
 * nothing (`RIn = never`) and provides every service. Build it once and `Effect.provide` it at the
 * boundary.
 */
export const ServerLive: Layer.Layer<ServerServices> = Layer.mergeAll(
  SignalsRepositoryLive,
  IncidentsRepositoryLive,
  DashboardServiceLive,
  CompareServiceLive,
  MetricsServiceLive,
  HealthServiceLive
).pipe(Layer.provide(DatasetLive))

/** What a route-facing effect may require: any server service plus the per-request context. */
export type ApiRequirements = ServerServices | RequestContext

/**
 * The same server wiring as {@link ServerLive}, but over a dataset built from explicit fixtures.
 * This is the seam tests plug into: provide it (plus a `RequestContext`) and a route-facing effect
 * runs against exactly the rows the case declares, with zero mocking of repositories.
 */
export const makeServerTestLayer = (data: {
  signals?: readonly Signal[]
  incidents?: readonly Incident[]
  events?: readonly TimelineEvent[]
  analysts?: readonly Analyst[]
  sources?: readonly Source[]
}): Layer.Layer<ServerServices> =>
  Layer.mergeAll(
    SignalsRepositoryLive,
    IncidentsRepositoryLive,
    DashboardServiceLive,
    CompareServiceLive,
    MetricsServiceLive,
    HealthServiceLive
  ).pipe(Layer.provide(makeDatasetLayer(data)))
