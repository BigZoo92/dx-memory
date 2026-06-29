import { describe, expect, it } from 'vitest'
import { INCIDENT_IMPACTS, SIGNAL_SEVERITIES, SIGNAL_STATUSES } from '@signalops/contracts'
import {
  COMPONENTS,
  NAV_ROUTES,
  ROUTES,
  SCREENS,
  UI_STATES,
  colors,
  impactHue,
  severityHue,
  spacing,
  statusHue
} from './index'

describe('tokens', () => {
  it('keeps the orange accent from the design spec', () => {
    expect(colors.accent.base).toBe('#ef7e00')
  })

  it('uses the documented spacing scale', () => {
    expect(spacing).toEqual([4, 8, 12, 16, 20, 24, 32, 40])
  })

  it('maps every contract enum value to a hue', () => {
    for (const s of SIGNAL_SEVERITIES) expect(severityHue[s]).toBeDefined()
    for (const s of SIGNAL_STATUSES) expect(statusHue[s]).toBeDefined()
    for (const i of INCIDENT_IMPACTS) expect(impactHue[i]).toBeDefined()
  })
})

describe('routes', () => {
  it('declares the seven product routes', () => {
    expect(ROUTES).toHaveLength(7)
    const paths = ROUTES.map((r) => r.path)
    expect(paths).toEqual([
      '/',
      '/signals',
      '/signals/:id',
      '/incidents',
      '/compare',
      '/dx-metrics',
      '/settings'
    ])
  })

  it('excludes the detail page from the nav and keeps nav order', () => {
    expect(NAV_ROUTES).toHaveLength(6)
    expect(NAV_ROUTES.some((r) => r.id === 'signal-detail')).toBe(false)
    const orders = NAV_ROUTES.map((r) => r.navOrder ?? 0)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
  })
})

describe('screens & states', () => {
  it('has one blueprint per route id', () => {
    expect(SCREENS).toHaveLength(7)
    const screenIds = SCREENS.map((s) => s.id).sort()
    const routeIds = ROUTES.map((r) => r.id).sort()
    expect(screenIds).toEqual(routeIds)
  })

  it('requires all eight async UI states', () => {
    expect(UI_STATES).toHaveLength(8)
    expect(UI_STATES).toContain('partial-error')
    expect(UI_STATES).toContain('slow-network')
  })
})

describe('components', () => {
  it('includes the variant badge — the only allowed visible difference', () => {
    expect(COMPONENTS.some((c) => c.name === 'VariantBadge')).toBe(true)
    expect(COMPONENTS.some((c) => c.name === 'DataTable')).toBe(true)
  })
})
