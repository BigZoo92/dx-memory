/**
 * @signalops/flow-feature-dashboard — the `/` Overview screen.
 *
 * KPI cards, severity/over-time charts, most-critical signals (→ detail), system status, the AI
 * recommendation card and recent incidents (→ incidents). Refresh + JSON export. Reads
 * `/api/dashboard/summary` via `@signalops/flow-api-client`.
 */
export { DashboardScreen } from './DashboardScreen'
export { dashboardToJson } from './export'
