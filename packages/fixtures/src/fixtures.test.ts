import { describe, expect, it } from 'vitest'
import {
  SIGNAL_SEVERITIES,
  SIGNAL_SOURCES,
  SIGNAL_STATUSES,
  VARIANT_IDS
} from '@signalops/contracts'
import { Random } from './random'
import { FIXTURE_COUNTS } from './constants'
import { generateAll, generateSignals, generateAnalysts, generateSources } from './generate'

describe('Random', () => {
  it('is deterministic for a given seed', () => {
    const a = new Random(42)
    const b = new Random(42)
    const seqA = Array.from({ length: 20 }, () => a.next())
    const seqB = Array.from({ length: 20 }, () => b.next())
    expect(seqA).toEqual(seqB)
  })

  it('produces values in range', () => {
    const r = new Random(7)
    for (let i = 0; i < 1000; i++) {
      const n = r.int(5, 10)
      expect(n).toBeGreaterThanOrEqual(5)
      expect(n).toBeLessThanOrEqual(10)
    }
  })
})

describe('generateAll', () => {
  const data = generateAll()

  it('meets the contract volumes', () => {
    expect(data.signals).toHaveLength(FIXTURE_COUNTS.signals)
    expect(data.incidents).toHaveLength(FIXTURE_COUNTS.incidents)
    expect(data.analysts).toHaveLength(FIXTURE_COUNTS.analysts)
    expect(data.sources).toHaveLength(FIXTURE_COUNTS.sources)
    expect(data.events).toHaveLength(FIXTURE_COUNTS.events)
    expect(data.dxMetricsSeed.map((m) => m.variant)).toEqual([...VARIANT_IDS])
  })

  it('produces valid, in-range signals', () => {
    for (const s of data.signals) {
      expect(SIGNAL_SEVERITIES).toContain(s.severity)
      expect(SIGNAL_STATUSES).toContain(s.status)
      expect(SIGNAL_SOURCES).toContain(s.source)
      expect(s.riskScore).toBeGreaterThanOrEqual(0)
      expect(s.riskScore).toBeLessThanOrEqual(100)
      if (s.confidence !== null) {
        expect(s.confidence).toBeGreaterThanOrEqual(0)
        expect(s.confidence).toBeLessThanOrEqual(1)
      }
      expect(s.tags.length).toBeGreaterThanOrEqual(1)
      expect(s.riskTrend).toBeUndefined() // reserved for the AI cost-of-change task
    }
  })

  it('has some null confidence and some linked incidents (exercising UI states)', () => {
    expect(data.signals.some((s) => s.confidence === null)).toBe(true)
    expect(data.signals.some((s) => s.hasLinkedIncident)).toBe(true)
  })

  it('keeps references coherent across entities', () => {
    const signalIds = new Set(data.signals.map((s) => s.id))
    const analystIds = new Set(data.analysts.map((a) => a.id))

    for (const inc of data.incidents) {
      expect(inc.linkedSignalIds.length).toBeGreaterThanOrEqual(1)
      for (const id of inc.linkedSignalIds) expect(signalIds.has(id)).toBe(true)
      expect(analystIds.has(inc.owner)).toBe(true)
      if (inc.status === 'resolved') expect(inc.resolvedAt).not.toBeNull()
      else expect(inc.resolvedAt).toBeNull()
    }

    for (const e of data.events) expect(signalIds.has(e.signalId)).toBe(true)

    // Every linked signal id is flagged on the signal itself.
    const linkedFromIncidents = new Set(data.incidents.flatMap((i) => i.linkedSignalIds))
    for (const id of linkedFromIncidents) {
      const signal = data.signals.find((s) => s.id === id)
      expect(signal?.hasLinkedIncident).toBe(true)
    }
  })
})

describe('determinism', () => {
  it('produces identical output for the same seed', () => {
    const rngA = new Random(123)
    const analystsA = generateAnalysts(rngA)
    const sourcesA = generateSources(rngA)
    const signalsA = generateSignals(rngA, analystsA, sourcesA, 250)

    const rngB = new Random(123)
    const analystsB = generateAnalysts(rngB)
    const sourcesB = generateSources(rngB)
    const signalsB = generateSignals(rngB, analystsB, sourcesB, 250)

    expect(JSON.stringify(signalsA)).toEqual(JSON.stringify(signalsB))
  })

  it('produces different output for different seeds', () => {
    const a = generateSignals(
      new Random(1),
      generateAnalysts(new Random(1)),
      generateSources(new Random(1)),
      50
    )
    const b = generateSignals(
      new Random(2),
      generateAnalysts(new Random(2)),
      generateSources(new Random(2)),
      50
    )
    expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b))
  })
})
