import { render, screen } from '@testing-library/react'
import {
  Badge,
  SeverityBadge,
  StatusBadge,
  RiskTrendBadge,
  ImpactBadge,
  KpiCard,
  Toggle,
  EmptyState
} from './components'

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge hue="red">Hello</Badge>)
    expect(screen.getByText('Hello')).toBeTruthy()
  })
  it('applies the hue class', () => {
    const { container } = render(<Badge hue="green">Ok</Badge>)
    expect(container.querySelector('.badge-green')).toBeTruthy()
  })
})

describe('SeverityBadge', () => {
  it('shows the text label', () => {
    render(<SeverityBadge severity="critical" />)
    expect(screen.getByText('Critical')).toBeTruthy()
  })
})

describe('StatusBadge', () => {
  it('shows the text label', () => {
    render(<StatusBadge status="investigating" />)
    expect(screen.getByText('Investigating')).toBeTruthy()
  })
})

describe('RiskTrendBadge', () => {
  it('shows the text label', () => {
    render(<RiskTrendBadge trend="up" />)
    expect(screen.getByText('Rising')).toBeTruthy()
  })
  it('applies the hue class', () => {
    const { container } = render(<RiskTrendBadge trend="down" />)
    expect(container.querySelector('.badge-green')).toBeTruthy()
  })
})

describe('ImpactBadge', () => {
  it('shows the text label', () => {
    render(<ImpactBadge impact="security" />)
    expect(screen.getByText('Security')).toBeTruthy()
  })
})

describe('KpiCard', () => {
  it('renders label and value', () => {
    render(<KpiCard kpi={{ label: 'Open signals', value: 42, trend: 'up', trendLabel: 'up' }} />)
    expect(screen.getByText('Open signals')).toBeTruthy()
    expect(screen.getByText('42')).toBeTruthy()
  })
  it('prefers the display value', () => {
    render(
      <KpiCard
        kpi={{ label: 'Time', value: 1, display: '2d 3h', trend: 'down', trendLabel: 'x' }}
      />
    )
    expect(screen.getByText('2d 3h')).toBeTruthy()
  })
})

describe('Toggle', () => {
  it('has switch role and reflects checked', () => {
    render(<Toggle label="Flag" checked={true} onChange={() => {}} />)
    const el = screen.getByRole('switch')
    expect(el.getAttribute('aria-checked')).toBe('true')
  })
})

describe('EmptyState', () => {
  it('shows the message', () => {
    render(<EmptyState message="No signals match your current filters." />)
    expect(screen.getByText('No signals match your current filters.')).toBeTruthy()
  })
})
