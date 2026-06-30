import { describe, expect, it } from 'vitest'
import type { DxMetric } from '@signalops/contracts'
import { aiTaskOutcome, buildAxisCards, formatMetricDuration, formatMetricValue } from './axes'

// Flow's seed metrics, inline so flow-domain depends on @signalops/contracts only.
const flow: DxMetric = {
  variant: 'flow',
  installTimeMs: 22_000,
  typecheckTimeMs: 8_000,
  testTimeMs: 54_000,
  buildTimeMs: 38_000,
  dockerBuildTimeMs: 110_000,
  ciDurationMs: 220_000,
  bundleSizeKb: 198,
  mainChunkSizeKb: 121,
  lighthousePerformance: 94,
  tableRenderTimeMs: 120,
  filesTouchedForAiTask: 6,
  testsImpacted: 9,
  errorReproductionSteps: 2,
  docsPagesNeeded: 1,
  aiTaskResult: 'success'
}

describe('metric formatting', () => {
  it('formats durations like the reference', () => {
    expect(formatMetricDuration(38_000)).toBe('38s')
    expect(formatMetricDuration(72_000)).toBe('1m 12s')
    expect(formatMetricDuration(125_000)).toBe('2m 05s')
    expect(formatMetricDuration(560_000)).toBe('9m 20s')
  })

  it('formats sizes, ms and counts with the right units', () => {
    expect(formatMetricValue('bundleSizeKb', 198)).toBe('198 KB')
    expect(formatMetricValue('tableRenderTimeMs', 120)).toBe('120 ms')
    expect(formatMetricValue('lighthousePerformance', 94)).toBe('94')
    expect(formatMetricValue('filesTouchedForAiTask', 6)).toBe('6')
  })
})

describe('Build/Ship/Run/Change axis cards', () => {
  const cards = buildAxisCards(flow)

  it('produces one card per axis with the right headline metric', () => {
    expect(cards.map((c) => c.axis)).toEqual(['Build', 'Ship', 'Run', 'Change'])
    expect(cards[0]).toMatchObject({ headlineKey: 'buildTimeMs', headlineValue: '38s' })
    expect(cards[1]).toMatchObject({ headlineKey: 'ciDurationMs', headlineValue: '3m 40s' })
    expect(cards[2]).toMatchObject({ headlineKey: 'lighthousePerformance', headlineValue: '94' })
    expect(cards[3]).toMatchObject({ headlineKey: 'filesTouchedForAiTask', headlineValue: '6' })
  })

  it('classifies the AI task outcome from the result', () => {
    expect(aiTaskOutcome(flow)).toEqual({ label: 'Healthy', kind: 'good' })
    expect(aiTaskOutcome({ ...flow, aiTaskResult: 'partial' })).toEqual({
      label: 'High cost',
      kind: 'bad'
    })
  })
})
