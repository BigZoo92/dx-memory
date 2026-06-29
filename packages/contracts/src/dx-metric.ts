export type VariantId = 'friction' | 'flow' | 'overfit'

/**
 * The four delivery-cost axes used on the `/dx-metrics` screen and in the measurement
 * protocol (`docs/product/02-measurement-protocol.md`).
 */
export type MetricAxis = 'Build' | 'Ship' | 'Run' | 'Change'

export type AiTaskResult = 'success' | 'partial' | 'failed'

export type DxMetric = {
  variant: VariantId
  installTimeMs: number
  buildTimeMs: number
  testTimeMs: number
  typecheckTimeMs: number
  bundleSizeKb: number
  mainChunkSizeKb: number
  dockerBuildTimeMs: number
  ciDurationMs: number
  /** Lighthouse performance score (0–100). Higher is better — the only metric where that is true. */
  lighthousePerformance: number
  tableRenderTimeMs: number
  filesTouchedForAiTask: number
  testsImpacted: number
  errorReproductionSteps: number
  docsPagesNeeded: number
  aiTaskResult: AiTaskResult
}

export const VARIANT_IDS = ['friction', 'flow', 'overfit'] as const
export const METRIC_AXES = ['Build', 'Ship', 'Run', 'Change'] as const

/** Keys of `DxMetric` that are numeric measurements (everything except `variant` and `aiTaskResult`). */
export type DxMetricNumericKey = Exclude<keyof DxMetric, 'variant' | 'aiTaskResult'>

/**
 * Whether a given metric is "better" when lower. Lighthouse is the only metric where
 * higher is better; everything else is a cost (time, size, count) where lower wins.
 */
export const METRIC_LOWER_IS_BETTER: Record<DxMetricNumericKey, boolean> = {
  installTimeMs: true,
  buildTimeMs: true,
  testTimeMs: true,
  typecheckTimeMs: true,
  bundleSizeKb: true,
  mainChunkSizeKb: true,
  dockerBuildTimeMs: true,
  ciDurationMs: true,
  lighthousePerformance: false,
  tableRenderTimeMs: true,
  filesTouchedForAiTask: true,
  testsImpacted: true,
  errorReproductionSteps: true,
  docsPagesNeeded: true
}

export function isVariantId(value: unknown): value is VariantId {
  return typeof value === 'string' && (VARIANT_IDS as readonly string[]).includes(value)
}
