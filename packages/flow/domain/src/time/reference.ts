/**
 * Reference "now" for deterministic relative-time math (incident ages, "resolved this week").
 * Mirrors the fixtures' deterministic anchor so the UI's relative times match the dataset window
 * without the client having to depend on `@signalops/fixtures`. Pure constant — framework-free.
 */
export const REFERENCE_NOW_MS = Date.parse('2026-06-29T12:00:00.000Z')
