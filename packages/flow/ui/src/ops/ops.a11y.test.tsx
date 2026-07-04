import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RequestIdBadge } from './RequestIdBadge'
import { ErrorInboxTable } from './ErrorInboxTable'
import type { OpsLogRow } from './types'

describe('RequestIdBadge accessibility', () => {
  it('gives the copy button an accessible name that includes the request id', () => {
    render(<RequestIdBadge requestId="req_abc123" />)
    expect(screen.getByRole('button', { name: /copy request id req_abc123/i })).toBeInTheDocument()
  })

  it('exposes a polite live region for the copy confirmation', () => {
    render(<RequestIdBadge requestId="req_abc123" />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
  })
})

describe('ErrorInboxTable accessibility', () => {
  const rows: OpsLogRow[] = [
    {
      id: '1',
      level: 'error',
      message: 'Unhandled exception',
      route: '/api/signals',
      status: 500,
      requestId: 'req_1',
      count: 3,
      firstAt: '2026-01-01T00:00:00.000Z',
      lastAt: '2026-01-01T00:05:00.000Z'
    }
  ]

  it('renders real, accessible column headers', () => {
    render(<ErrorInboxTable rows={rows} />)
    expect(screen.getAllByRole('columnheader')).toHaveLength(7)
    expect(screen.getByRole('columnheader', { name: 'Request ID' })).toBeInTheDocument()
  })
})
