import { describe, expect, it } from 'vitest'
import {
  compareAssignmentDelta,
  compareConfidenceDelta,
  compareRiskDelta,
  compareSeverityDelta
} from './compare'

describe('compare deltas (before/after)', () => {
  it('classifies severity escalation as bad and de-escalation as good', () => {
    expect(compareSeverityDelta('high', 'critical')).toBe('bad')
    expect(compareSeverityDelta('critical', 'high')).toBe('good')
    expect(compareSeverityDelta('medium', 'medium')).toBe('no-change')
  })

  it('classifies a rising risk score as bad', () => {
    expect(compareRiskDelta(78, 91)).toBe('bad')
    expect(compareRiskDelta(91, 78)).toBe('good')
    expect(compareRiskDelta(50, 50)).toBe('no-change')
  })

  it('classifies confidence by band', () => {
    expect(compareConfidenceDelta(0.5, 0.5)).toBe('no-change') // Medium → Medium
    expect(compareConfidenceDelta(0.2, 0.9)).toBe('good') // Low → High
    expect(compareConfidenceDelta(0.9, null)).toBe('bad') // High → Unavailable
  })

  it('classifies assignment changes', () => {
    expect(compareAssignmentDelta(null, 'ana_1')).toBe('good')
    expect(compareAssignmentDelta('ana_1', null)).toBe('bad')
    expect(compareAssignmentDelta('ana_1', 'ana_2')).toBe('neutral')
    expect(compareAssignmentDelta('ana_1', 'ana_1')).toBe('no-change')
  })
})
