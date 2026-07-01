import { describe, expect, it } from 'vitest'
import { RUN_READINESS_SEED, formatDurationSeconds } from './run-readiness'

describe('run readiness', () => {
  it('formats durations', () => {
    expect(formatDurationSeconds(25)).toBe('25s')
    expect(formatDurationSeconds(90)).toBe('1m 30s')
    expect(formatDurationSeconds(540)).toBe('9m')
  })

  it('exposes a stable seed', () => {
    expect(RUN_READINESS_SEED.mttdSeconds).toBeGreaterThan(0)
    expect(RUN_READINESS_SEED.mttrSeconds).toBeGreaterThan(RUN_READINESS_SEED.mttdSeconds)
  })
})
