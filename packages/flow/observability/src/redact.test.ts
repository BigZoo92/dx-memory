import { describe, expect, it } from 'vitest'
import { REDACTED, redactEvent, redactRecord, redactString } from './redact'
import { FLOW_VARIANT } from './types'

describe('redact', () => {
  it('redacts sensitive keys but keeps safe ones', () => {
    const out = redactRecord({ authorization: 'Bearer abc', apiKey: 'x', name: 'ok', count: 3 })
    expect(out.authorization).toBe(REDACTED)
    expect(out.apiKey).toBe(REDACTED)
    expect(out.name).toBe('ok')
    expect(out.count).toBe(3)
  })

  it('redacts bearer tokens inside free text', () => {
    expect(redactString('header Bearer abc.def-ghi tail')).toContain(REDACTED)
  })

  it('truncates very long strings', () => {
    expect(redactString('a'.repeat(5000)).length).toBeLessThan(5000)
  })

  it('redacts safeContext but preserves a requestId in the message', () => {
    const event = redactEvent({
      id: 'evt_1',
      timestamp: new Date().toISOString(),
      level: 'error',
      runtime: 'server',
      variant: FLOW_VARIANT,
      message: 'failed req_12345678-aaaa-bbbb',
      safeContext: { password: 'secret', ok: 1 }
    })
    expect(event.message).toContain('req_12345678')
    expect(event.safeContext?.password).toBe(REDACTED)
    expect(event.safeContext?.ok).toBe(1)
  })
})
