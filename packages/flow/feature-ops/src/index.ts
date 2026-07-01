/**
 * @signalops/flow-feature-ops — the `/ops` Operational health screen.
 *
 * Fuses the client and server in-memory observability stores into an error inbox, alerts, run-health
 * counters, a breadcrumb timeline and a redacted diagnostic pack. Reads `/api/logs` and `/api/health`
 * via `@signalops/flow-api-client`; presentational pieces come from `@signalops/flow-ui`; the event
 * model, alert rules, counters and pack builder come from `@signalops/flow-observability` (core only).
 */
export { OpsScreen } from './OpsScreen'
export { toInboxRows } from './grouping'
export { useOpsData, type OpsData } from './useOpsData'
