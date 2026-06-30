/**
 * @signalops/flow-api-client
 *
 * The Flow variant's browser-side API surface: a typed `fetch` wrapper (`apiGet`/`apiPost`,
 * `ApiRequestError`, `toQueryString`) and the TanStack Query hooks every feature uses to read
 * `/api/*`. Plus the client-side demo controls (slow network / forced error) that the Settings
 * screen drives.
 *
 * Rule: CLIENT-ONLY. Depends on `@signalops/contracts` (shared types) and TanStack Query — never
 * on `@signalops/flow-server-data-access` or `@signalops/fixtures`. The server data never reaches
 * the client through this package; only HTTP does.
 */
export * from './client'
export * from './queries'
export * from './demo-controls'
