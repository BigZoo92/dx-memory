import type { DxMetric, DxMetricNumericKey, MetricAxis } from '@signalops/contracts'

/**
 * Maps the raw DX metrics onto the four delivery-cost axes shown on `/dx-metrics`
 * (Build / Ship / Run / Change) and formats each value for display. This is the domain's
 * answer to "what does Build/Ship/Run/Change actually cost?" — pure, so the screen and any
 * report compute it identically.
 */

/** Display label for every numeric metric (matches the full metrics table rows). */
export const METRIC_LABELS: Record<DxMetricNumericKey, string> = {
  installTimeMs: 'Install time',
  typecheckTimeMs: 'Typecheck time',
  testTimeMs: 'Test time',
  buildTimeMs: 'Build time',
  dockerBuildTimeMs: 'Docker build time',
  ciDurationMs: 'CI duration',
  bundleSizeKb: 'Bundle size',
  mainChunkSizeKb: 'Main chunk size',
  lighthousePerformance: 'Lighthouse performance',
  tableRenderTimeMs: 'Table render time',
  filesTouchedForAiTask: 'Files touched · AI task',
  testsImpacted: 'Tests impacted',
  errorReproductionSteps: 'Error reproduction steps',
  docsPagesNeeded: 'Docs pages needed'
}

/** Stable order of metrics in the full table (mirrors the design spec table). */
export const METRIC_ORDER: DxMetricNumericKey[] = [
  'installTimeMs',
  'typecheckTimeMs',
  'testTimeMs',
  'buildTimeMs',
  'dockerBuildTimeMs',
  'ciDurationMs',
  'bundleSizeKb',
  'mainChunkSizeKb',
  'lighthousePerformance',
  'tableRenderTimeMs',
  'filesTouchedForAiTask',
  'testsImpacted',
  'errorReproductionSteps',
  'docsPagesNeeded'
]

const DURATION_KEYS = new Set<DxMetricNumericKey>([
  'installTimeMs',
  'typecheckTimeMs',
  'testTimeMs',
  'buildTimeMs',
  'dockerBuildTimeMs',
  'ciDurationMs'
])

/** Format a metric duration in ms the way the reference does: `38s`, `1m 12s`, `2m 05s`. */
export function formatMetricDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}

/** Format any numeric metric for display, unit-aware. */
export function formatMetricValue(key: DxMetricNumericKey, value: number): string {
  if (DURATION_KEYS.has(key)) return formatMetricDuration(value)
  if (key === 'bundleSizeKb' || key === 'mainChunkSizeKb') return `${value} KB`
  if (key === 'tableRenderTimeMs') return `${value} ms`
  return String(value)
}

export type AxisSubMetric = { key: DxMetricNumericKey; label: string; value: string }
export type AxisCard = {
  axis: MetricAxis
  headlineKey: DxMetricNumericKey
  headlineLabel: string
  headlineValue: string
  subs: AxisSubMetric[]
}

const AXIS_DEFINITIONS: Array<{
  axis: MetricAxis
  headline: DxMetricNumericKey
  subs: DxMetricNumericKey[]
}> = [
  {
    axis: 'Build',
    headline: 'buildTimeMs',
    subs: ['installTimeMs', 'typecheckTimeMs', 'testTimeMs']
  },
  { axis: 'Ship', headline: 'ciDurationMs', subs: ['dockerBuildTimeMs'] },
  { axis: 'Run', headline: 'lighthousePerformance', subs: ['bundleSizeKb', 'tableRenderTimeMs'] },
  { axis: 'Change', headline: 'filesTouchedForAiTask', subs: ['testsImpacted', 'docsPagesNeeded'] }
]

function sub(metric: DxMetric, key: DxMetricNumericKey): AxisSubMetric {
  return { key, label: METRIC_LABELS[key], value: formatMetricValue(key, metric[key]) }
}

/** Build the four Build/Ship/Run/Change axis cards for a single variant's metrics. */
export function buildAxisCards(metric: DxMetric): AxisCard[] {
  return AXIS_DEFINITIONS.map((def) => ({
    axis: def.axis,
    headlineKey: def.headline,
    headlineLabel: METRIC_LABELS[def.headline],
    headlineValue: formatMetricValue(def.headline, metric[def.headline]),
    subs: def.subs.map((key) => sub(metric, key))
  }))
}

/** AI cost-of-change task outcome → display chip ("Healthy" vs "High cost"). */
export function aiTaskOutcome(metric: DxMetric): { label: string; kind: 'good' | 'bad' } {
  return metric.aiTaskResult === 'success'
    ? { label: 'Healthy', kind: 'good' }
    : { label: 'High cost', kind: 'bad' }
}
