import { describe, expect, it } from 'vitest'
import { METRIC_AXES } from '@signalops/contracts'
import { SCENARIOS, getScenario, scenariosByAxis } from './index'

const PRODUCT_ROUTES = new Set([
  '/',
  '/signals',
  '/signals/:id',
  '/incidents',
  '/compare',
  '/dx-metrics',
  '/settings'
])

describe('SCENARIOS', () => {
  it('defines the ten shared scenarios', () => {
    expect(SCENARIOS).toHaveLength(10)
  })

  it('has unique ids', () => {
    const ids = SCENARIOS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every scenario is well-formed and points at a real route and axis', () => {
    for (const s of SCENARIOS) {
      expect(s.id).toMatch(/^[a-z0-9-]+$/)
      expect(s.title.length).toBeGreaterThan(0)
      expect(PRODUCT_ROUTES.has(s.route)).toBe(true)
      expect(s.steps.length).toBeGreaterThanOrEqual(1)
      expect(s.expectedResult.length).toBeGreaterThan(0)
      expect(METRIC_AXES).toContain(s.relatedMetricAxis)
    }
  })
})

describe('helpers', () => {
  it('getScenario finds by id', () => {
    expect(getScenario('compare-before-after')?.route).toBe('/compare')
    expect(getScenario('nope')).toBeUndefined()
  })

  it('scenariosByAxis filters by axis', () => {
    const change = scenariosByAxis('Change')
    expect(change.length).toBeGreaterThan(0)
    expect(change.every((s) => s.relatedMetricAxis === 'Change')).toBe(true)
  })
})
