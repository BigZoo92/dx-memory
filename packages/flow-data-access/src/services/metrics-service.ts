import { existsSync, readFileSync } from 'node:fs'
import { VARIANT_IDS, type DxMetric, type DxMetricsResponse } from '@signalops/contracts'
import { DX_METRICS_SEED } from '@signalops/fixtures'
import { VARIANT_ID } from '../config'

function isVariantArray(value: unknown): value is DxMetric[] {
  return Array.isArray(value) && value.length === VARIANT_IDS.length
}

/**
 * Read collected metrics from the JSON produced by `pnpm metrics:collect`
 * (`packages/metrics/results/results.json`, shape `{ variants: DxMetric[] }`, or a bare array).
 * Returns `undefined` when the file is absent or malformed, so the API falls back to seed.
 */
function tryLoadCollected(resultsPath: string): DxMetric[] | undefined {
  if (!existsSync(resultsPath)) return undefined
  try {
    const parsed = JSON.parse(readFileSync(resultsPath, 'utf8')) as unknown
    if (isVariantArray(parsed)) return parsed
    if (
      parsed &&
      typeof parsed === 'object' &&
      isVariantArray((parsed as { variants?: unknown }).variants)
    ) {
      return (parsed as { variants: DxMetric[] }).variants
    }
  } catch {
    // fall through to seed
  }
  return undefined
}

/**
 * Build `/api/dx-metrics`. Prefers collected results when a results file is provided and valid,
 * otherwise serves the seed values and marks `source: 'seed'` — the screen never lies about
 * where its numbers came from (per the measurement protocol).
 */
export function buildDxMetricsResponse(options: { resultsPath?: string } = {}): DxMetricsResponse {
  const collected = options.resultsPath ? tryLoadCollected(options.resultsPath) : undefined
  return {
    metrics: collected ?? DX_METRICS_SEED,
    current: VARIANT_ID,
    source: collected ? 'collected' : 'seed'
  }
}
