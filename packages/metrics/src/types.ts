import type { DxMetric, DxMetricNumericKey, VariantId } from '@signalops/contracts'

/**
 * Where the numbers came from:
 * - `seed`: design placeholder values (still need to be replaced before the defense).
 * - `collected`: real measurements produced by running the variants.
 */
export type MetricSource = 'seed' | 'collected'

/** The winning variant for a single metric. */
export type MetricWinner = {
  metric: DxMetricNumericKey
  lowerIsBetter: boolean
  bestVariant: VariantId
  bestValue: number
  values: Record<VariantId, number>
}

/** The shape written to `packages/metrics/results/results.json`. */
export type MetricsResults = {
  generatedAt: string
  source: MetricSource
  seed: number | null
  variants: DxMetric[]
  winners: MetricWinner[]
  notes: string[]
}

export type CollectOptions = {
  /** Override the path to the seed file (defaults to the fixtures data file). */
  seedPath?: string
  /** Injectable clock for deterministic tests. */
  now?: () => string
}
