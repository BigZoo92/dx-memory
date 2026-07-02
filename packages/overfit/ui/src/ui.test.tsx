import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RiskTrendBadge } from './index'
import { riskTrendLabel } from './format'

describe('overfit-ui', () => {
  it('risk-trend badge renders a text label (not color alone)', () => {
    render(<RiskTrendBadge trend="up" />)
    expect(screen.getByText('Rising')).toBeDefined()
  })

  it('maps every risk trend to a readable label', () => {
    expect(riskTrendLabel('up')).toBe('Rising')
    expect(riskTrendLabel('stable')).toBe('Stable')
    expect(riskTrendLabel('down')).toBe('Falling')
  })
})
