import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Signal } from '@signalops/contracts'
import { SignalsTable } from './SignalsTable'

function signal(id: string, overrides: Partial<Signal> = {}): Signal {
  return {
    id,
    title: `Signal ${id}`,
    description: 'desc',
    severity: 'high',
    status: 'new',
    source: 'internal',
    confidence: 0.8,
    riskScore: 72,
    region: 'eu',
    assignedTo: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    tags: [],
    hasLinkedIncident: false,
    ...overrides
  }
}

const signals = [signal('sig_1'), signal('sig_2', { severity: 'low' })]

const noop = () => {}

describe('SignalsTable accessibility', () => {
  it('exposes an accessible grid with column headers', () => {
    render(
      <SignalsTable
        signals={signals}
        rowSelection={{}}
        onRowSelectionChange={noop}
        sorting={[]}
        onSortingChange={noop}
      />
    )
    expect(screen.getByRole('grid', { name: 'Signals' })).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader').length).toBeGreaterThan(0)
  })

  it('marks exactly one column as sorted via aria-sort', () => {
    render(
      <SignalsTable
        signals={signals}
        rowSelection={{}}
        onRowSelectionChange={noop}
        sorting={[{ id: 'severity', desc: false }]}
        onSortingChange={noop}
      />
    )
    const sorted = screen
      .getAllByRole('columnheader')
      .filter((h) => {
        const value = h.getAttribute('aria-sort')
        return value === 'ascending' || value === 'descending'
      })
    expect(sorted).toHaveLength(1)
    expect(sorted[0]).toHaveAttribute('aria-sort', 'ascending')
  })
})
