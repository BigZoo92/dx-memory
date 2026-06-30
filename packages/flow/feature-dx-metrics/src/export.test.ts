import { describe, expect, it } from 'vitest'
import type { DxMetric, DxMetricsResponse, VariantId } from '@signalops/contracts'
import { dxMetricsToCsv, dxMetricsToJson } from './export'

function metric(variant: VariantId, bundleSizeKb: number): DxMetric {
  return {
    variant,
    installTimeMs: 1000,
    buildTimeMs: 1000,
    testTimeMs: 1000,
    typecheckTimeMs: 1000,
    bundleSizeKb,
    mainChunkSizeKb: 100,
    dockerBuildTimeMs: 1000,
    ciDurationMs: 1000,
    lighthousePerformance: 94,
    tableRenderTimeMs: 120,
    filesTouchedForAiTask: 6,
    testsImpacted: 9,
    errorReproductionSteps: 2,
    docsPagesNeeded: 1,
    aiTaskResult: 'success'
  }
}

const response: DxMetricsResponse = {
  metrics: [metric('friction', 412), metric('flow', 198), metric('overfit', 164)],
  current: 'flow',
  source: 'seed'
}

describe('dxMetricsToCsv', () => {
  it('emits a header row with each variant', () => {
    const csv = dxMetricsToCsv(response)
    expect(csv.split('\n')[0]).toBe('metric,friction,flow,overfit')
  })

  it('emits one row per metric with the variant values', () => {
    const csv = dxMetricsToCsv(response)
    const bundleRow = csv.split('\n').find((r) => r.startsWith('Bundle size'))
    expect(bundleRow).toBe('Bundle size,412,198,164')
  })
})

describe('dxMetricsToJson', () => {
  it('round-trips the response as pretty JSON', () => {
    expect(JSON.parse(dxMetricsToJson(response))).toEqual(response)
  })
})
