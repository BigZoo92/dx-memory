import { describe, expect, it } from 'vitest'
import { Cause, Effect, Exit, Option } from 'effect'
import { FlowValidationError } from '@signalops/flow-effect'
import { RequestContext } from '../effect/request-context'
import { parseIncidentsQuery, parseSignalsQuery } from './parse'

// Provide a fixed request context, run to an Exit so we can inspect both success and typed failure.
const run = <A, E>(effect: Effect.Effect<A, E, RequestContext>): Promise<Exit.Exit<A, E>> =>
  Effect.runPromiseExit(
    effect.pipe(Effect.provideService(RequestContext, { requestId: 'req_test' }))
  )

const valueOf = async <A, E>(effect: Effect.Effect<A, E, RequestContext>): Promise<A> => {
  const exit = await run(effect)
  if (Exit.isFailure(exit)) throw new Error('expected success')
  return exit.value
}

const errorOf = async <A>(
  effect: Effect.Effect<A, FlowValidationError, RequestContext>
): Promise<FlowValidationError> => {
  const exit = await run(effect)
  if (Exit.isSuccess(exit)) throw new Error('expected failure')
  return Option.getOrThrow(Cause.failureOption(exit.cause))
}

describe('parseSignalsQuery (Effect Schema)', () => {
  it('parses and coerces a valid query', async () => {
    const query = await valueOf(
      parseSignalsQuery({
        search: 'auth',
        severity: 'critical',
        status: 'new',
        page: '2',
        pageSize: '25',
        sortBy: 'riskScore',
        sortDirection: 'desc'
      })
    )
    expect(query).toMatchObject({
      search: 'auth',
      severity: 'critical',
      status: 'new',
      page: 2,
      pageSize: 25,
      sortBy: 'riskScore',
      sortDirection: 'desc'
    })
  })

  it('treats empty-string filters as absent (the "All" selection)', async () => {
    const query = await valueOf(parseSignalsQuery({ severity: '', status: '', search: '' }))
    expect(query.severity).toBeUndefined()
    expect(query.status).toBeUndefined()
  })

  it('accepts URLSearchParams directly', async () => {
    const query = await valueOf(parseSignalsQuery(new URLSearchParams('severity=high&page=3')))
    expect(query.severity).toBe('high')
    expect(query.page).toBe(3)
  })

  it('parses the riskTrend filter and rejects unknown trends', async () => {
    const query = await valueOf(parseSignalsQuery({ riskTrend: 'up' }))
    expect(query.riskTrend).toBe('up')
    const error = await errorOf(parseSignalsQuery({ riskTrend: 'sideways' }))
    expect(error).toBeInstanceOf(FlowValidationError)
  })

  it('fails with a typed FlowValidationError for an invalid enum value', async () => {
    const error = await errorOf(parseSignalsQuery({ severity: 'nuclear' }))
    expect(error).toBeInstanceOf(FlowValidationError)
    expect(error._tag).toBe('FlowValidationError')
    expect(error.requestId).toBe('req_test')
    // ArrayFormatter issues are attached as structured details (no stack trace).
    expect(Array.isArray(error.details)).toBe(true)
  })

  it('rejects an out-of-range pageSize', async () => {
    const exit = await run(parseSignalsQuery({ pageSize: '5000' }))
    expect(Exit.isFailure(exit)).toBe(true)
  })
})

describe('parseIncidentsQuery (Effect Schema)', () => {
  it('parses incident filters', async () => {
    const query = await valueOf(parseIncidentsQuery({ status: 'open', impact: 'security' }))
    expect(query).toMatchObject({ status: 'open', impact: 'security' })
  })

  it('fails for an invalid status', async () => {
    const exit = await run(parseIncidentsQuery({ status: 'pending' }))
    expect(Exit.isFailure(exit)).toBe(true)
  })
})
