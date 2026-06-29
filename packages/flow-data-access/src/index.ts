/**
 * @signalops/flow-data-access
 *
 * Server-side data access for the Flow variant: the dataset loader, repositories (signals,
 * incidents, events), services (dashboard, compare, metrics, health), Zod query parsing and
 * the typed `ApiError` layer. Consumed by the TanStack Start server routes in `flow-app`.
 *
 * Rule: NO UI here — no React, no components. Depends on `@signalops/contracts`,
 * `@signalops/fixtures` and `@signalops/flow-domain` only.
 */
export * from './config'
export * from './api-errors'
export * from './fixtures'
export * from './query/parse'
export * from './repositories'
export * from './services'
