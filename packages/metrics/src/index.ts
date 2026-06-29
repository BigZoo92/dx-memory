/**
 * @signalops/metrics
 *
 * Turns DX metrics into a comparable, machine-readable results file. In this pass the
 * inputs are seed/demo values; the same pipeline will ingest collected measurements later.
 * `/dx-metrics` reads the generated JSON when available and falls back to seed data.
 */
export { collectMetrics, computeWinners, DEFAULT_SEED_PATH } from './collect'
export type { MetricSource, MetricWinner, MetricsResults, CollectOptions } from './types'
