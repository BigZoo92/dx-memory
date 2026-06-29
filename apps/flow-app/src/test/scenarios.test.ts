import { describe, expect, it } from 'vitest'
import { SCENARIOS } from '@signalops/test-scenarios'

// The product routes Flow implements (file-based). Maps the shared scenarios to real routes so
// a dropped scenario/route is caught here. Detail/dynamic routes are matched by prefix.
const IMPLEMENTED_ROUTES = [
  '/',
  '/signals',
  '/signals/:id',
  '/incidents',
  '/compare',
  '/dx-metrics',
  '/settings'
]

function isImplemented(route: string): boolean {
  return IMPLEMENTED_ROUTES.some(
    (r) => r === route || (r.includes(':') && route.startsWith(r.split('/:')[0]))
  )
}

describe('shared test-scenarios coverage', () => {
  it('every scenario targets a route Flow implements', () => {
    for (const scenario of SCENARIOS) {
      expect(isImplemented(scenario.route), `${scenario.id} → ${scenario.route}`).toBe(true)
    }
  })

  it('covers all 10 shared scenarios', () => {
    expect(SCENARIOS).toHaveLength(10)
  })
})
