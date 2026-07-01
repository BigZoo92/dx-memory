import { describe, expect, it } from 'vitest'
import { createLogger } from './logger'
import { createLogStore } from './memory-store'

describe('logger', () => {
  it('emits redacted, structured events with an OTel severity number', () => {
    const store = createLogStore()
    const logger = createLogger({ store, runtime: 'api-client' })
    const emitted = logger.error('request failed', {
      requestId: 'req_1',
      status: 500,
      errorTag: 'FlowApiError',
      safeContext: { token: 'abc' }
    })
    expect(emitted).not.toBeNull()
    expect(store.size()).toBe(1)
    const stored = store.list()[0]
    expect(stored.severityNumber).toBe(17)
    expect(stored.requestId).toBe('req_1')
    expect(stored.safeContext?.token).toBe('[redacted]')
  })

  it('drops events below the configured minimum level', () => {
    const store = createLogStore()
    const logger = createLogger({ store, runtime: 'server', minLevel: 'warn' })
    expect(logger.debug('noise')).toBeNull()
    expect(store.size()).toBe(0)
  })
})
