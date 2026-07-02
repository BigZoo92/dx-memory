import { describe, expect, it } from 'vitest'
import { RISK_TREND_TASK_MANIFEST, scoreChange } from './index'

describe('ai-governance', () => {
  it('the risk-trend task touches a disproportionate surface', () => {
    expect(RISK_TREND_TASK_MANIFEST.filesTouched).toBe(41)
    expect(RISK_TREND_TASK_MANIFEST.requiresHumanReview).toBe(true)
  })

  it('blocks changes touching forbidden files', () => {
    const s = scoreChange({ filesTouched: 3, crossesLayers: 1, touchesGenerated: false, touchesForbidden: true })
    expect(s.level).toBe('blocked')
  })

  it('scores the risk-trend change as high cost', () => {
    const s = scoreChange({ filesTouched: 41, crossesLayers: 5, touchesGenerated: true, touchesForbidden: false })
    expect(s.level).toBe('high')
    expect(s.reasons.length).toBeGreaterThan(0)
  })
})
