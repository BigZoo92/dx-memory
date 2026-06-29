/**
 * @signalops/flow-domain
 *
 * Pure business logic for the Flow variant: severity ranking, confidence normalization,
 * filters, stable sorting, dashboard KPIs, incident summaries, compare deltas and the
 * Build/Ship/Run/Change metric mapping.
 *
 * Hard rule: this package is FRAMEWORK-FREE. No React, no DOM, no filesystem, no TanStack.
 * It depends only on `@signalops/contracts`, so it can be type-checked and tested in isolation
 * and reused by data-access and the app without dragging UI concerns along.
 */
export * from './signals'
export * from './dashboard'
export * from './incidents'
export * from './compare'
export * from './metrics'
export * from './format'
