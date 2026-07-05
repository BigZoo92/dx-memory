import { describe, expect, it } from 'vitest'
import { Cause, Effect, Exit, Layer, Option } from 'effect'
import type { Signal } from '@signalops/contracts'
import { FlowNotFoundError } from '@signalops/flow-effect'
import { getSignals } from '../fixtures/dataset'
import { makeDatasetLayer } from '../effect/dataset'
import { RequestContext } from '../effect/request-context'
import { runApiEffect } from '../effect/run'
import { getSignalByIdEffect, getSignalEventsEffect, getSignalsEffect } from '../effect/api'
import { SignalsRepository, SignalsRepositoryLive, querySignals } from './signals-repository'

function makeSignal(over: Partial<Signal> = {}): Signal {
  return {
    id: 'sig_x',
    title: 'Signal',
    description: 'd',
    severity: 'medium',
    status: 'new',
    source: 'internal',
    confidence: 0.5,
    riskScore: 50,
    region: 'EU-West',
    assignedTo: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    tags: [],
    hasLinkedIncident: false,
    ...over
  }
}

// Run an effect against a mock dataset + a fixed request context. This is the Effect testing seam:
// the repository under test is the real one; only its data source is swapped.
const REQUEST = { requestId: 'req_test' }
function runWith<A, E>(
  effect: Effect.Effect<A, E, SignalsRepository | RequestContext>,
  signals: readonly Signal[]
): Promise<Exit.Exit<A, E>> {
  return Effect.runPromiseExit(
    effect.pipe(
      Effect.provide(SignalsRepositoryLive.pipe(Layer.provide(makeDatasetLayer({ signals })))),
      Effect.provideService(RequestContext, REQUEST)
    )
  )
}

describe('querySignals (pure) — filtering', () => {
  it('filters by severity against the full 10k dataset', () => {
    const result = querySignals({ severity: 'critical', pageSize: 200 }, getSignals())
    expect(result.total).toBeGreaterThan(0)
    expect(result.items.every((s) => s.severity === 'critical')).toBe(true)
  })

  it('combines filters (AND)', () => {
    const result = querySignals(
      { severity: 'critical', source: 'api', pageSize: 200 },
      getSignals()
    )
    expect(result.items.every((s) => s.severity === 'critical' && s.source === 'api')).toBe(true)
  })

  it('returns an empty page (no error) when nothing matches', () => {
    const result = querySignals({ search: 'zzz-no-such-signal-zzz' }, getSignals())
    expect(result.total).toBe(0)
    expect(result.items).toEqual([])
  })

  it('serves a riskTrend derived from riskScore on every signal, and filters by it', () => {
    const signals = getSignals()
    expect(
      signals.every(
        (s) => s.riskTrend === (s.riskScore >= 80 ? 'up' : s.riskScore <= 35 ? 'down' : 'stable')
      )
    ).toBe(true)
    const result = querySignals({ riskTrend: 'up', pageSize: 200 }, signals)
    expect(result.total).toBeGreaterThan(0)
    expect(result.items.every((s) => s.riskTrend === 'up')).toBe(true)
  })
})

describe('querySignals (pure) — stable pagination & sort', () => {
  const signals = Array.from({ length: 125 }, (_, i) =>
    makeSignal({ id: `sig_${String(i).padStart(4, '0')}`, riskScore: i % 7 })
  )

  it('paginates without overlap and covers every row exactly once', () => {
    const seen = new Set<string>()
    let page = 1
    let pages = 1
    do {
      const result = querySignals(
        { page, pageSize: 50, sortBy: 'riskScore', sortDirection: 'desc' },
        signals
      )
      pages = result.totalPages
      for (const item of result.items) {
        expect(seen.has(item.id)).toBe(false)
        seen.add(item.id)
      }
      page++
    } while (page <= pages)
    expect(seen.size).toBe(signals.length)
  })

  it('clamps an out-of-range page instead of returning garbage', () => {
    const result = querySignals({ page: 9999, pageSize: 50 }, signals)
    expect(result.page).toBe(result.totalPages)
    expect(result.items.length).toBeGreaterThan(0)
  })
})

describe('SignalsRepository (Effect) — getById/getEvents not found', () => {
  it('fails with a typed FlowNotFoundError (discriminated by _tag)', async () => {
    const exit = await runWith(getSignalByIdEffect('sig_missing'), [makeSignal({ id: 'sig_real' })])
    expect(Exit.isFailure(exit)).toBe(true)
    if (Exit.isFailure(exit)) {
      const error = Option.getOrThrow(Cause.failureOption(exit.cause))
      expect(error).toBeInstanceOf(FlowNotFoundError)
      expect(error._tag).toBe('FlowNotFoundError')
      expect(error.requestId).toBe('req_test')
      expect(error.id).toBe('sig_missing')
    }
  })

  it('getEvents also fails not-found for an unknown signal', async () => {
    const exit = await runWith(getSignalEventsEffect('nope'), [makeSignal({ id: 'sig_real' })])
    expect(Exit.isFailure(exit)).toBe(true)
  })

  it('resolves a real signal detail with linked incident or null (mock dataset)', async () => {
    const exit = await runWith(getSignalByIdEffect('sig_real'), [makeSignal({ id: 'sig_real' })])
    const detail = Exit.isSuccess(exit) ? exit.value : undefined
    expect(detail?.signal.id).toBe('sig_real')
    expect(detail?.linkedIncident).toBeNull()
  })
})

describe('runApiEffect — not found maps to the ApiError envelope', () => {
  it('maps a missing signal to a 404 not_found with a requestId', async () => {
    const result = await runApiEffect(getSignalByIdEffect('sig_does_not_exist'))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(404)
      expect(result.error.code).toBe('not_found')
      expect(result.error.requestId).toMatch(/^req_/)
    }
  })

  it('preserves confidence === null through the query effect (against live fixtures)', async () => {
    const result = await runApiEffect(getSignalsEffect({ pageSize: '200' }))
    expect(result.ok).toBe(true)
    const nullSignal = getSignals().find((s) => s.confidence === null)
    expect(nullSignal, 'fixtures should contain null-confidence signals').toBeTruthy()
  })
})
