/**
 * @signalops/flow-feature-signal-detail — the `/signals/:id` screen.
 *
 * Header (severity/status badges, actions: Assign / Change status / Escalate / Resolve with a
 * visible local effect), stat tiles, description + tags, linked sources, timeline (with partial
 * error), AI summary, recommended action and linked incident. The signal id arrives via the
 * `signalId` prop (the app owns the route); data via `@signalops/flow-api-client`.
 */
export { SignalDetailScreen } from './SignalDetailScreen'
