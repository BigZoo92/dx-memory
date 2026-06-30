/**
 * @signalops/flow-feature-settings — the `/settings` screen.
 *
 * Environment block (live API status from `/api/health`), feature-flag toggles, and demo controls
 * that have a REAL effect: "Simulate API error" / "Simulate slow network" flip client-side demo
 * controls in `@signalops/flow-api-client` so every widget actually fails or slows; "Reset demo
 * state" clears them. Variant identity is passed in by the app via the `variant` prop.
 */
export { SettingsScreen, type SettingsVariant } from './SettingsScreen'
