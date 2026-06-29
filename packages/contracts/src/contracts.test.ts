import { describe, expect, it } from 'vitest'
import {
  API_ROUTES,
  INCIDENT_IMPACTS,
  INCIDENT_STATUSES,
  METRIC_LOWER_IS_BETTER,
  SIGNAL_SEVERITIES,
  SIGNAL_SOURCES,
  SIGNAL_STATUSES,
  TIMELINE_EVENT_TYPES,
  VARIANT_IDS,
  isApiError,
  isSignalSeverity,
  isSignalSource,
  isSignalStatus,
  isVariantId
} from './index'

describe('contract enums', () => {
  it('match the product contract value sets', () => {
    expect(SIGNAL_SEVERITIES).toEqual(['low', 'medium', 'high', 'critical'])
    expect(SIGNAL_STATUSES).toEqual(['new', 'triaged', 'investigating', 'resolved', 'dismissed'])
    expect(SIGNAL_SOURCES).toEqual(['web', 'social', 'internal', 'partner', 'api', 'manual'])
    expect(INCIDENT_STATUSES).toEqual(['open', 'in_progress', 'resolved'])
    expect(INCIDENT_IMPACTS).toEqual(['user', 'system', 'security', 'business'])
    expect(TIMELINE_EVENT_TYPES).toHaveLength(6)
    expect(VARIANT_IDS).toEqual(['friction', 'flow', 'overfit'])
  })
})

describe('type guards', () => {
  it('accept valid values and reject invalid ones', () => {
    expect(isSignalSeverity('critical')).toBe(true)
    expect(isSignalSeverity('nope')).toBe(false)
    expect(isSignalStatus('triaged')).toBe(true)
    expect(isSignalSource('partner')).toBe(true)
    expect(isVariantId('flow')).toBe(true)
    expect(isVariantId('friction-web')).toBe(false)
  })

  it('isApiError validates the error envelope', () => {
    expect(isApiError({ code: 'X', message: 'boom', requestId: 'req_1' })).toBe(true)
    expect(isApiError({ code: 'X', message: 'boom' })).toBe(false)
    expect(isApiError(null)).toBe(false)
  })
})

describe('metric direction map', () => {
  it('marks lighthouse as higher-is-better and everything else as lower-is-better', () => {
    expect(METRIC_LOWER_IS_BETTER.lighthousePerformance).toBe(false)
    expect(METRIC_LOWER_IS_BETTER.buildTimeMs).toBe(true)
    expect(METRIC_LOWER_IS_BETTER.filesTouchedForAiTask).toBe(true)
    const higherIsBetter = Object.values(METRIC_LOWER_IS_BETTER).filter((v) => v === false)
    expect(higherIsBetter).toHaveLength(1)
  })
})

describe('API_ROUTES', () => {
  it('builds the documented endpoints', () => {
    expect(API_ROUTES.health).toBe('/api/health')
    expect(API_ROUTES.signalById('sig_1')).toBe('/api/signals/sig_1')
    expect(API_ROUTES.signalEvents('sig_1')).toBe('/api/signals/sig_1/events')
    expect(API_ROUTES.compareById('sig_1')).toBe('/api/compare/sig_1')
  })
})
