/**
 * @signalops/flow-feature-dx-metrics — the `/dx-metrics` screen.
 *
 * Build/Ship/Run/Change cards, the cross-variant comparison, the AI-task cost result, the
 * bundle/perf tiles, the full metrics table and CI history — plus CSV/JSON export of the data.
 * Reads `/api/dx-metrics` via `@signalops/flow-api-client`; presentational pieces come from
 * `@signalops/flow-ui`; metric labels/order/derivations from `@signalops/flow-domain`.
 */
export { DxMetricsScreen } from './DxMetricsScreen'
export { dxMetricsToCsv, dxMetricsToJson } from './export'
