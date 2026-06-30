import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime } from './date'

describe('date formatting', () => {
  it('formats an ISO timestamp as "Mon D, HH:MM" in UTC', () => {
    expect(formatDateTime('2026-06-29T09:14:00.000Z')).toBe('Jun 29, 09:14')
  })

  it('pads hours and minutes', () => {
    expect(formatDateTime('2026-01-05T03:07:00.000Z')).toBe('Jan 5, 03:07')
  })

  it('formats a date-only string', () => {
    expect(formatDate('2026-06-29T09:14:00.000Z')).toBe('Jun 29, 2026')
  })

  it('returns an em dash for invalid input', () => {
    expect(formatDateTime('not-a-date')).toBe('—')
    expect(formatDate('')).toBe('—')
  })
})
