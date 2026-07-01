import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'
import { observabilityLoggerLayer } from './effect'
import { createLogStore } from './memory-store'

describe('effect logging adapter', () => {
  it('captures annotated Effect logs as structured Flow events', async () => {
    const store = createLogStore()
    const program = Effect.logError('boom').pipe(
      Effect.annotateLogs({ requestId: 'req_test', route: '/api/signals' }),
      Effect.provide(observabilityLoggerLayer(store, 'server'))
    )
    await Effect.runPromise(program)
    const events = store.list()
    expect(events.length).toBe(1)
    expect(events[0].level).toBe('error')
    expect(events[0].requestId).toBe('req_test')
    expect(events[0].safeContext?.route).toBe('/api/signals')
  })
})
