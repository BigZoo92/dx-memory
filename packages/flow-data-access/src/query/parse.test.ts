import { describe, expect, it } from 'vitest'
import { ApiErrorException } from '../api-errors/api-error'
import { parseIncidentsQuery, parseSignalsQuery } from './parse'

describe('parseSignalsQuery', () => {
  it('parses and coerces a valid query', () => {
    const query = parseSignalsQuery({
      search: 'auth',
      severity: 'critical',
      status: 'new',
      page: '2',
      pageSize: '25',
      sortBy: 'riskScore',
      sortDirection: 'desc'
    })
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

  it('treats empty-string filters as absent (the "All" selection)', () => {
    const query = parseSignalsQuery({ severity: '', status: '', search: '' })
    expect(query.severity).toBeUndefined()
    expect(query.status).toBeUndefined()
  })

  it('accepts URLSearchParams directly', () => {
    const query = parseSignalsQuery(new URLSearchParams('severity=high&page=3'))
    expect(query.severity).toBe('high')
    expect(query.page).toBe(3)
  })

  it('throws a typed bad_request for an invalid enum value', () => {
    try {
      parseSignalsQuery({ severity: 'nuclear' })
      throw new Error('expected to throw')
    } catch (error) {
      expect(error).toBeInstanceOf(ApiErrorException)
      const envelope = (error as ApiErrorException).toApiError()
      expect(envelope.code).toBe('bad_request')
      expect((error as ApiErrorException).httpStatus).toBe(400)
      expect(envelope.requestId).toMatch(/^req_/)
    }
  })

  it('rejects an out-of-range pageSize', () => {
    expect(() => parseSignalsQuery({ pageSize: '5000' })).toThrowError(ApiErrorException)
  })
})

describe('parseIncidentsQuery', () => {
  it('parses incident filters', () => {
    const query = parseIncidentsQuery({ status: 'open', impact: 'security' })
    expect(query).toMatchObject({ status: 'open', impact: 'security' })
  })

  it('rejects an invalid status', () => {
    expect(() => parseIncidentsQuery({ status: 'pending' })).toThrowError(ApiErrorException)
  })
})
