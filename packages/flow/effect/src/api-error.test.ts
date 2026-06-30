import { describe, expect, it } from 'vitest'
import {
  FlowApiError,
  FlowNetworkError,
  FlowNotFoundError,
  FlowTimeoutError,
  FlowUnexpectedError,
  FlowValidationError
} from './errors'
import { toApiErrorPayload } from './api-error'
import { makeRequestId } from './request-id'

describe('makeRequestId', () => {
  it('produces a req_-prefixed unique id', () => {
    const a = makeRequestId()
    const b = makeRequestId()
    expect(a).toMatch(/^req_/)
    expect(a).not.toBe(b)
  })
})

describe('toApiErrorPayload — maps every Flow error to the ApiError envelope', () => {
  it('validation → 400 bad_request, keeps details + requestId', () => {
    const { status, body } = toApiErrorPayload(
      new FlowValidationError({ requestId: 'req_1', message: 'bad', details: [{ path: 'x' }] })
    )
    expect(status).toBe(400)
    expect(body).toMatchObject({ code: 'bad_request', message: 'bad', requestId: 'req_1' })
    expect(body.details).toEqual([{ path: 'x' }])
  })

  it('not found → 404 not_found with a composed message', () => {
    const { status, body } = toApiErrorPayload(
      new FlowNotFoundError({ requestId: 'req_2', resource: 'Signal', id: 'sig_9' })
    )
    expect(status).toBe(404)
    expect(body.code).toBe('not_found')
    expect(body.message).toBe('Signal not found: sig_9')
  })

  it('api error → preserves status and code', () => {
    const { status, body } = toApiErrorPayload(
      new FlowApiError({ requestId: 'req_3', status: 503, code: 'down', message: 'unavailable' })
    )
    expect(status).toBe(503)
    expect(body.code).toBe('down')
  })

  it('network → 502, timeout → 504, unexpected → 500', () => {
    expect(toApiErrorPayload(new FlowNetworkError({ requestId: 'r', message: 'm' })).status).toBe(
      502
    )
    expect(
      toApiErrorPayload(new FlowTimeoutError({ requestId: 'r', timeoutMs: 10_000 })).status
    ).toBe(504)
    expect(
      toApiErrorPayload(new FlowUnexpectedError({ requestId: 'r', message: 'boom' })).status
    ).toBe(500)
  })

  it('every error carries its requestId onto the envelope', () => {
    const { body } = toApiErrorPayload(
      new FlowTimeoutError({ requestId: 'req_keep', timeoutMs: 1 })
    )
    expect(body.requestId).toBe('req_keep')
  })
})
