import { describe, expect, it } from 'vitest'
import { badRequest, notFound } from '@signalops/flow-data-access'
import { handle } from './respond'

describe('handle (server route wrapper)', () => {
  it('returns JSON for a successful handler', async () => {
    const response = await handle(() => ({ ok: true }))
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
  })

  it('serializes an ApiErrorException to its envelope + status', async () => {
    const response = await handle(() => {
      throw notFound('Signal not found: sig_x')
    })
    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body).toMatchObject({ code: 'not_found', message: 'Signal not found: sig_x' })
    expect(body.requestId).toMatch(/^req_/)
  })

  it('maps a bad request to a 400 envelope', async () => {
    const response = await handle(() => {
      throw badRequest('Invalid query', { issue: 'x' })
    })
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.code).toBe('bad_request')
    expect(body.details).toEqual({ issue: 'x' })
  })

  it('coerces an unexpected error to a 500 envelope', async () => {
    const response = await handle(() => {
      throw new Error('boom')
    })
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.code).toBe('internal_error')
    expect(body.requestId).toMatch(/^req_/)
  })
})
