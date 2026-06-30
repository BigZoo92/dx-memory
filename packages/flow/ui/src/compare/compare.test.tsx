import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { CompareAttribute } from '@signalops/contracts'
import { ComparePanel } from './ComparePanel'

const attributes: CompareAttribute[] = [
  { attribute: 'Severity', before: 'High', after: 'Critical', changed: true, delta: 'bad' },
  { attribute: 'Risk score', before: '78', after: '91', changed: true, delta: 'bad' },
  {
    attribute: 'Confidence',
    before: 'Unavailable',
    after: 'Unavailable',
    changed: false,
    delta: 'no-change'
  }
]

describe('ComparePanel', () => {
  it('renders severity values as badges and shows delta + no-change rows', () => {
    render(<ComparePanel attributes={attributes} />)
    // Severity badges (real labels)
    expect(screen.getByText('High')).toBeTruthy()
    expect(screen.getByText('Critical')).toBeTruthy()
    // Plain values for non-badge rows
    expect(screen.getByText('91')).toBeTruthy()
    // Unchanged confidence row shows a "No change" chip
    expect(screen.getByText('No change')).toBeTruthy()
  })
})
