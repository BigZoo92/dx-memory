import { describe, expect, it } from 'vitest'
import { toSignalsQuery } from './query'

describe('toSignalsQuery', () => {
  it('applies Flow defaults (risk score desc, page 1) when search is empty', () => {
    expect(toSignalsQuery({}, 100)).toEqual({
      page: 1,
      pageSize: 100,
      sortBy: 'riskScore',
      sortDirection: 'desc'
    })
  })

  it('preserves explicit filters, sort and page', () => {
    expect(
      toSignalsQuery(
        { search: 'auth', severity: 'critical', sortBy: 'severity', sortDirection: 'asc', page: 3 },
        50
      )
    ).toEqual({
      search: 'auth',
      severity: 'critical',
      sortBy: 'severity',
      sortDirection: 'asc',
      page: 3,
      pageSize: 50
    })
  })
})
