/**
 * @signalops/flow-observability
 *
 * Local-first, memory-only observability for the Flow variant. The model mirrors OpenTelemetry's log
 * data model and Sentry's breadcrumb/redaction ideas, but ships as a tiny framework-free runtime: no
 * Sentry SDK, no OpenTelemetry SDK, no persistence, no network. Bounded ring buffers hold the events;
 * `redact` is the safety floor; alert rules and the diagnostic pack are pure functions over a snapshot.
 *
 * Hard rule (enforced by dependency-cruiser): the core imports NO React, NO TanStack, NO UI, NO
 * features, NO server-data-access, NO api-client, NO fixtures. The Effect logging adapter lives behind
 * the separate `@signalops/flow-observability/effect` entry point so `effect` never leaks here.
 */
export * from './types'
export * from './ids'
export * from './severity'
export * from './redact'
export * from './memory-store'
export * from './breadcrumbs'
export * from './logger'
export * from './alerts'
export * from './run-counters'
export * from './diagnostic-pack'
