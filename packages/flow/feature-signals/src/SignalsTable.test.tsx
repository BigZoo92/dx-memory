import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { Signal } from '@signalops/contracts'
import { SignalsTable } from './SignalsTable'

const navigate = vi.fn()

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router')
  return {
    ...actual,
    Link: ({ children, className }: { children: unknown; className?: string }) => (
      <a href="/signals/mock" className={className}>
        {children}
      </a>
    ),
    useNavigate: () => navigate
  }
})

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 64,
    getVirtualItems: () => Array.from({ length: count }, (_, index) => ({ index, start: index * 64 }))
  })
}))

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
  beforeEach(() => {
    navigate.mockReset()
  })

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
    const sorted = screen.getAllByRole('columnheader').filter((h) => {
      const value = h.getAttribute('aria-sort')
      return value === 'ascending' || value === 'descending'
    })
    expect(sorted).toHaveLength(1)
    expect(sorted[0]).toHaveAttribute('aria-sort', 'ascending')
  })

  it('declares the Risk trend column', () => {
    render(
      <SignalsTable
        signals={[signal('sig_up', { riskTrend: 'up' })]}
        rowSelection={{}}
        onRowSelectionChange={noop}
        sorting={[]}
        onSortingChange={noop}
      />
    )
    expect(screen.getByRole('columnheader', { name: 'Risk trend' })).toBeInTheDocument()
  })

  it('opens the signal detail view from the keyboard on a focused row', () => {
    render(
      <SignalsTable
        signals={signals}
        rowSelection={{}}
        onRowSelectionChange={noop}
        sorting={[]}
        onSortingChange={noop}
      />
    )

    const firstDataRow = screen.getAllByRole('row')[1]
    fireEvent.keyDown(firstDataRow, { key: 'Enter' })

    expect(navigate).toHaveBeenCalledWith({ to: '/signals/$id', params: { id: 'sig_1' } })
  })
})
