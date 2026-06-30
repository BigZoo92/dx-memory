import { describe, expect, it } from 'vitest'
import { SIGNAL_STATUSES } from '@signalops/contracts'
import { nextStatus } from './status'

describe('nextStatus', () => {
  it('visits every status across one full cycle', () => {
    let s = SIGNAL_STATUSES[0]
    const seen = new Set([s])
    for (let i = 0; i < SIGNAL_STATUSES.length - 1; i++) {
      s = nextStatus(s)
      seen.add(s)
    }
    expect(seen.size).toBe(SIGNAL_STATUSES.length)
  })

  it('wraps from the last status back to the first', () => {
    const last = SIGNAL_STATUSES[SIGNAL_STATUSES.length - 1]
    expect(nextStatus(last)).toBe(SIGNAL_STATUSES[0])
  })
})
