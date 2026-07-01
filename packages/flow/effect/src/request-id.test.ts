import { describe, expect, it } from 'vitest'
import { isValidRequestId, makeRequestId, resolveRequestId } from './request-id'

describe('request id', () => {
  it('mints a prefixed id that validates', () => {
    const id = makeRequestId()
    expect(id.startsWith('req_')).toBe(true)
    expect(isValidRequestId(id)).toBe(true)
  })

  it('rejects malformed or hostile values', () => {
    expect(isValidRequestId('')).toBe(false)
    expect(isValidRequestId('abc')).toBe(false)
    expect(isValidRequestId('req_<script>')).toBe(false)
    expect(isValidRequestId(undefined)).toBe(false)
    expect(isValidRequestId(123)).toBe(false)
  })

  it('reuses a valid incoming id but mints a fresh one otherwise', () => {
    const incoming = makeRequestId()
    expect(resolveRequestId(incoming)).toBe(incoming)
    expect(resolveRequestId(null).startsWith('req_')).toBe(true)
    expect(resolveRequestId('garbage').startsWith('req_')).toBe(true)
  })
})
