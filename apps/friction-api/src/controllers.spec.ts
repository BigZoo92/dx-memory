import { describe, it, expect } from 'vitest'
import { SignalsService } from './signals.service'
import { SignalsController } from './signals.controller'
import { IncidentsController } from './incidents.controller'
import { DashboardController } from './dashboard.controller'
import { CompareController } from './compare.controller'
import { MetricsController } from './metrics.controller'
import { HealthController } from './health.controller'
import { SimulateController } from './simulate.controller'

const svc = new SignalsService()

describe('SignalsController', () => {
  const c = new SignalsController(svc)
  it('lists signals', () => {
    expect(c.list({ pageSize: '5' } as any).items.length).toBe(5)
  })
  it('lists with default page size', () => {
    expect(c.list({} as any).items.length).toBe(50)
  })
  it('gets one signal', () => {
    expect(c.one('sig_00001').signal.id).toBe('sig_00001')
  })
  it('throws for a missing signal', () => {
    expect(() => c.one('nope')).toThrow()
  })
  it('returns events for a signal', () => {
    expect(Array.isArray(c.events('sig_00001'))).toBe(true)
  })
})

describe('IncidentsController', () => {
  const c = new IncidentsController()
  it('lists incidents', () => {
    expect(c.list({} as any).items.length).toBeGreaterThan(0)
  })
  it('reports a total', () => {
    expect(c.list({} as any).total).toBe(300)
  })
})

describe('DashboardController', () => {
  it('returns a summary', () => {
    expect(new DashboardController().summary().kpis).toBeDefined()
  })
})

describe('CompareController', () => {
  const c = new CompareController()
  it('compares a signal', () => {
    expect(c.compare('sig_00001').signalId).toBe('sig_00001')
  })
  it('throws for a missing signal', () => {
    expect(() => c.compare('nope')).toThrow()
  })
})

describe('MetricsController', () => {
  const r = new MetricsController().metrics()
  it('marks the current variant', () => {
    expect(r.current).toBe('friction')
  })
  it('is seed sourced', () => {
    expect(r.source).toBe('seed')
  })
})

describe('HealthController', () => {
  const r = new HealthController().health()
  it('is ok', () => {
    expect(r.status).toBe('ok')
  })
  it('names the friction variant', () => {
    expect(r.variant).toContain('Friction')
  })
})

describe('SimulateController', () => {
  it('throws a simulated error', () => {
    expect(() => new SimulateController().simulate()).toThrow()
  })
})
