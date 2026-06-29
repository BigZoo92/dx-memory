import { describe, expect, it } from 'vitest'
import { METRIC_LOWER_IS_BETTER } from '@signalops/contracts'
import { collectMetrics, computeWinners } from './index'

const fixedNow = () => '2026-06-29T12:00:00.000Z'

describe('collectMetrics', () => {
  it('returns the three variants from seed data', () => {
    const results = collectMetrics({ seedPath: '/does/not/exist.json', now: fixedNow })
    expect(results.source).toBe('seed')
    expect(results.generatedAt).toBe('2026-06-29T12:00:00.000Z')
    expect(results.variants.map((v) => v.variant)).toEqual(['friction', 'flow', 'overfit'])
  })

  it('produces a winner for every numeric metric', () => {
    const results = collectMetrics({ seedPath: '/does/not/exist.json', now: fixedNow })
    expect(results.winners).toHaveLength(Object.keys(METRIC_LOWER_IS_BETTER).length)
  })
})

describe('computeWinners', () => {
  const results = collectMetrics({ seedPath: '/does/not/exist.json', now: fixedNow })
  const winners = computeWinners(results.variants)
  const byMetric = Object.fromEntries(winners.map((w) => [w.metric, w]))

  it('reflects the design narrative', () => {
    // Flow wins the change-cost and feedback-loop metrics.
    expect(byMetric.installTimeMs.bestVariant).toBe('flow')
    expect(byMetric.filesTouchedForAiTask.bestVariant).toBe('flow')
    expect(byMetric.testsImpacted.bestVariant).toBe('flow')
    // Overfit wins raw runtime/build/bundle.
    expect(byMetric.bundleSizeKb.bestVariant).toBe('overfit')
    expect(byMetric.buildTimeMs.bestVariant).toBe('overfit')
    expect(byMetric.tableRenderTimeMs.bestVariant).toBe('overfit')
  })

  it('treats lighthouse as higher-is-better', () => {
    expect(byMetric.lighthousePerformance.lowerIsBetter).toBe(false)
    expect(byMetric.lighthousePerformance.bestVariant).toBe('overfit')
    expect(byMetric.lighthousePerformance.bestValue).toBe(97)
  })
})
