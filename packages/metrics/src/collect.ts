import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  METRIC_LOWER_IS_BETTER,
  VARIANT_IDS,
  type DxMetric,
  type DxMetricNumericKey,
  type VariantId
} from '@signalops/contracts'
import { DEFAULT_SEED, DX_METRICS_SEED } from '@signalops/fixtures'
import type { CollectOptions, MetricSource, MetricsResults, MetricWinner } from './types'

const here = dirname(fileURLToPath(import.meta.url))

/** Default location of the seed produced by `pnpm fixtures:generate`. */
export const DEFAULT_SEED_PATH = join(here, '..', '..', 'fixtures', 'data', 'dx-metrics.seed.json')

/**
 * Load the metrics to report.
 *
 * In this socle pass the values are always seed/demo numbers: we prefer the generated
 * `dx-metrics.seed.json` if present, and fall back to the in-package seed constant so the
 * command still works standalone. The pipeline is shaped to ingest `collected` metrics later
 * (one merge point: replace this loader's output with collected runs and flip `source`).
 */
function loadMetrics(seedPath: string): { metrics: DxMetric[]; source: MetricSource } {
  if (existsSync(seedPath)) {
    try {
      const parsed = JSON.parse(readFileSync(seedPath, 'utf8')) as DxMetric[]
      if (Array.isArray(parsed) && parsed.length === VARIANT_IDS.length) {
        return { metrics: parsed, source: 'seed' }
      }
    } catch {
      // fall through to the bundled seed
    }
  }
  return { metrics: DX_METRICS_SEED, source: 'seed' }
}

function computeWinners(metrics: DxMetric[]): MetricWinner[] {
  const byVariant = new Map<VariantId, DxMetric>(metrics.map((m) => [m.variant, m]))
  const keys = Object.keys(METRIC_LOWER_IS_BETTER) as DxMetricNumericKey[]

  return keys.map((metric) => {
    const lowerIsBetter = METRIC_LOWER_IS_BETTER[metric]
    const values = {} as Record<VariantId, number>
    let bestVariant: VariantId = metrics[0].variant
    let bestValue = metrics[0][metric]

    for (const m of metrics) {
      values[m.variant] = m[metric]
      const isBetter = lowerIsBetter ? m[metric] < bestValue : m[metric] > bestValue
      if (isBetter) {
        bestValue = m[metric]
        bestVariant = m.variant
      }
    }

    return { metric, lowerIsBetter, bestVariant, bestValue, values }
  })
}

export function collectMetrics(options: CollectOptions = {}): MetricsResults {
  const seedPath = options.seedPath ?? DEFAULT_SEED_PATH
  const now = options.now ?? (() => new Date().toISOString())
  const { metrics, source } = loadMetrics(seedPath)

  return {
    generatedAt: now(),
    source,
    seed: DEFAULT_SEED,
    variants: metrics,
    winners: computeWinners(metrics),
    notes: [
      'These are SEED/DEMO values transcribed from docs/product/01-design-spec.md.',
      'Replace them with collected measurements before the defense (see docs/product/02-measurement-protocol.md).',
      `Source: ${source}. Seed file: ${seedPath}.`
    ]
  }
}

export { computeWinners }
