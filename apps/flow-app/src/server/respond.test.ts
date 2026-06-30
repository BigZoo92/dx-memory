import { describe, expect, it } from 'vitest'
import { Effect } from 'effect'
import {
  getHealthEffect,
  getSignalByIdEffect,
  getSignalsEffect,
  type ApiEffect
} from '@signalops/flow-server-data-access'
import { handleEffect } from './respond'

describe('handleEffect (server route boundary)', () => {
  it('returns 200 JSON for a successful effect', async () => {
    const response = await handleEffect(getHealthEffect())
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.status).toBe('ok')
    expect(body.variant).toBe('Variant B — Flow')
  })

  it('maps a validation failure to a 400 bad_request envelope', async () => {
    const response = await handleEffect(getSignalsEffect({ severity: 'nuclear' }))
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.code).toBe('bad_request')
    expect(body.requestId).toMatch(/^req_/)
    // The Schema parse error is surfaced as structured details, never a stack trace.
    expect(body.details).toBeTruthy()
  })

  it('maps a not-found failure to a 404 not_found envelope', async () => {
    const response = await handleEffect(getSignalByIdEffect('sig_does_not_exist'))
    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.code).toBe('not_found')
    expect(body.message).toContain('sig_does_not_exist')
    expect(body.requestId).toMatch(/^req_/)
  })

  it('coerces an unexpected defect to an opaque 500 (no stack leak)', async () => {
    const boom = Effect.die(new Error('boom')) as ApiEffect<never>
    const response = await handleEffect(boom)
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.code).toBe('internal_error')
    expect(body.requestId).toMatch(/^req_/)
  })
})
