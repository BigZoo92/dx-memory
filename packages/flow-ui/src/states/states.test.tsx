import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'
import { PartialError } from './Banner'

describe('EmptyState', () => {
  it('shows the canonical empty message by default', () => {
    render(<EmptyState />)
    expect(screen.getByText('No signals match your current filters.')).toBeTruthy()
  })

  it('accepts a custom message', () => {
    render(<EmptyState message="No incidents found." />)
    expect(screen.getByText('No incidents found.')).toBeTruthy()
  })
})

describe('ErrorState', () => {
  it('renders the request id and fires retry', () => {
    const onRetry = vi.fn()
    render(<ErrorState requestId="req_123" onRetry={onRetry} />)
    expect(screen.getByText('Request ID: req_123')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})

describe('PartialError', () => {
  it('shows the canonical partial-error microcopy with Retry', () => {
    const onRetry = vi.fn()
    render(<PartialError onRetry={onRetry} />)
    expect(screen.getByText('Some widgets could not be refreshed.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
