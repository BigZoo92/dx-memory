/**
 * @signalops/flow-data-access
 *
 * Server-side data access for the Flow variant. The data edge is driven by Effect: repositories and
 * services are injectable Effect services (`Context.Tag` + `Layer`), failures travel a typed error
 * channel (`@signalops/flow-effect`), and `runApiEffect` provides the live layer + request context
 * and maps any failure to the canonical `ApiError`. Pure compute (filter/sort/paginate, KPI math)
 * stays as plain functions; Effect only wraps IO, dependency injection and the error channel.
 *
 * Rule: NO UI here, no React. Depends on `@signalops/contracts`, `@signalops/fixtures`,
 * `@signalops/flow-domain`, `@signalops/flow-effect` and `effect`.
 */

// Pure config + fixtures + the legacy ApiErrorException (used by the non-Effect simulate-error route)
export * from './config'
export * from './api-errors'
export * from './fixtures'

// Effect foundation: request context, dataset service, layer wiring, the run boundary, errors helpers
export * from './effect/request-context'
export * from './effect/dataset'
export * from './effect/layers'
export * from './effect/run'
export * from './effect/errors'

// Route-facing effects (the API's public surface)
export * from './effect/api'

// Query parsing (Effect Schema) + repositories/services (tags, live layers, pure builders)
export * from './query/parse'
export * from './repositories'
export * from './services'

// Re-export the typed Flow error channel so consumers import errors from one place.
export {
  FlowValidationError,
  FlowNotFoundError,
  FlowApiError,
  FlowNetworkError,
  FlowTimeoutError,
  FlowUnexpectedError,
  isValidRequestId,
  resolveRequestId,
  type FlowError
} from '@signalops/flow-effect'
