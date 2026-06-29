import { describe, expect, it } from 'vitest'
import { makeIncident } from '../test-utils'
import {
  computeIncidentSummary,
  formatImpact,
  formatIncidentStatus,
  isActiveIncident
} from './incidents'

describe('incident formatting', () => {
  it('formats statuses and impacts', () => {
    expect(formatIncidentStatus('in_progress')).toBe('In progress')
    expect(formatIncidentStatus('open')).toBe('Open')
    expect(formatImpact('security')).toBe('Security')
  })

  it('treats anything not resolved as active', () => {
    expect(isActiveIncident(makeIncident({ status: 'open' }))).toBe(true)
    expect(isActiveIncident(makeIncident({ status: 'resolved' }))).toBe(false)
  })
})

describe('computeIncidentSummary', () => {
  const now = Date.parse('2026-06-14T12:00:00.000Z')
  const incidents = [
    makeIncident({ id: 'i1', status: 'open', severity: 'critical' }),
    makeIncident({ id: 'i2', status: 'in_progress', severity: 'high' }),
    makeIncident({
      id: 'i3',
      status: 'resolved',
      severity: 'critical',
      createdAt: '2026-06-13T12:00:00.000Z',
      resolvedAt: '2026-06-13T14:00:00.000Z'
    }),
    makeIncident({
      id: 'i4',
      status: 'resolved',
      createdAt: '2026-05-01T12:00:00.000Z',
      resolvedAt: '2026-05-01T18:00:00.000Z'
    })
  ]

  it('counts active, critical-active, avg resolution and resolved-this-week', () => {
    const summary = computeIncidentSummary(incidents, now)
    expect(summary.active).toBe(2)
    expect(summary.critical).toBe(1) // only the open critical, not the resolved one
    expect(summary.resolvedThisWeek).toBe(1) // i3 within 7 days; i4 is older
    expect(summary.avgResolutionTimeMs).toBe(4 * 60 * 60 * 1000) // mean of 2h and 6h
  })
})
