import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SeverityBadge } from './SeverityBadge'
import { StatusBadge } from './StatusBadge'
import { ImpactBadge, IncidentStatusBadge } from './ImpactBadge'
import { ConfidenceDisplay } from './ConfidenceDisplay'
import { VariantBadge } from './VariantBadge'

describe('badges carry a text label (never color alone)', () => {
  it('SeverityBadge renders the severity label', () => {
    render(<SeverityBadge severity="critical" />)
    expect(screen.getByText('Critical')).toBeTruthy()
  })

  it('StatusBadge renders the status label', () => {
    render(<StatusBadge status="investigating" />)
    expect(screen.getByText('Investigating')).toBeTruthy()
  })

  it('ImpactBadge and IncidentStatusBadge render labels', () => {
    render(<ImpactBadge impact="security" />)
    expect(screen.getByText('Security')).toBeTruthy()
    render(<IncidentStatusBadge status="in_progress" />)
    expect(screen.getByText('In progress')).toBeTruthy()
  })

  it('VariantBadge shows the variant label', () => {
    render(<VariantBadge label="Variant B — Flow" />)
    expect(screen.getByText('Variant B — Flow')).toBeTruthy()
  })
})

describe('ConfidenceDisplay handles null', () => {
  it('shows "Unavailable" in table mode for null confidence', () => {
    render(<ConfidenceDisplay confidence={null} />)
    expect(screen.getByText('Unavailable')).toBeTruthy()
  })

  it('shows the full "Confidence unavailable." sentence in detail mode', () => {
    render(<ConfidenceDisplay confidence={null} mode="detail" />)
    expect(screen.getByText('Confidence unavailable.')).toBeTruthy()
  })

  it('bands numeric confidence into a label', () => {
    render(<ConfidenceDisplay confidence={0.92} />)
    expect(screen.getByText('High')).toBeTruthy()
  })
})
