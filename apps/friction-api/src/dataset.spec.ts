import { describe, it, expect } from 'vitest'
import { getDataset, DX_METRICS_SEED, Rng } from './dataset'

describe('dataset', () => {
  const d = getDataset()

  it('generates 10000 signals', () => {
    expect(d.signals.length).toBe(10000)
  })
  it('generates 300 incidents', () => {
    expect(d.incidents.length).toBe(300)
  })
  it('generates 50000 events', () => {
    expect(d.events.length).toBe(50000)
  })
  it('generates 25 analysts', () => {
    expect(d.analysts.length).toBe(25)
  })
  it('generates 12 sources', () => {
    expect(d.sources.length).toBe(12)
  })
  it('is cached (same reference)', () => {
    expect(getDataset()).toBe(d)
  })
  it('signal ids are zero-padded', () => {
    expect(d.signals[0].id).toBe('sig_00001')
  })
  it('incident ids are zero-padded', () => {
    expect(d.incidents[0].id).toBe('inc_001')
  })
  it('analyst 1 is admin', () => {
    expect(d.analysts[0].role).toBe('admin')
  })
  it('every signal has a severity', () => {
    expect(d.signals.every((s) => !!s.severity)).toBe(true)
  })
  it('every signal has a status', () => {
    expect(d.signals.every((s) => !!s.status)).toBe(true)
  })
  it('some signals are flagged with a linked incident', () => {
    expect(d.signals.some((s) => s.hasLinkedIncident)).toBe(true)
  })
  it('every signal has a risk trend derived from its risk score', () => {
    expect(
      d.signals.every(
        (s) => s.riskTrend === (s.riskScore >= 80 ? 'up' : s.riskScore <= 35 ? 'down' : 'stable')
      )
    ).toBe(true)
  })
})

describe('Rng', () => {
  it('is deterministic for a seed', () => {
    const a = new Rng(1)
    const b = new Rng(1)
    expect(a.next()).toBe(b.next())
  })
  it('int is within range', () => {
    const r = new Rng(2)
    for (let i = 0; i < 50; i++) {
      const v = r.int(3, 9)
      expect(v).toBeGreaterThanOrEqual(3)
      expect(v).toBeLessThanOrEqual(9)
    }
  })
  it('id pads correctly', () => {
    expect(Rng.id('x', 7, 4)).toBe('x_0007')
  })
})

describe('DX_METRICS_SEED', () => {
  it('has three variants', () => {
    expect(DX_METRICS_SEED.length).toBe(3)
  })
  it('friction is first', () => {
    expect(DX_METRICS_SEED[0].variant).toBe('friction')
  })
  it('friction bundle is larger than flow', () => {
    expect(DX_METRICS_SEED[0].bundleSizeKb).toBeGreaterThan(DX_METRICS_SEED[1].bundleSizeKb)
  })
})
