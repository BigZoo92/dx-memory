import type { DxMetric, DxMetricsResponse } from '@signalops/contracts'
import { METRIC_LABELS, METRIC_ORDER } from '@signalops/flow-domain'

/**
 * Build a CSV of every metric × variant from a DX metrics response. Pure (no DOM) so it is unit
 * testable; the screen wires it to a download.
 */
export function dxMetricsToCsv(data: DxMetricsResponse): string {
  const byVariant = data.metrics
  const header = ['metric', ...byVariant.map((m) => m.variant)].join(',')
  const rows = METRIC_ORDER.map((key) => {
    const cells = byVariant.map((m) => String((m as DxMetric)[key]))
    return [METRIC_LABELS[key], ...cells].join(',')
  })
  return [header, ...rows].join('\n')
}

/** Serialize the full response as pretty JSON. */
export function dxMetricsToJson(data: DxMetricsResponse): string {
  return JSON.stringify(data, null, 2)
}
