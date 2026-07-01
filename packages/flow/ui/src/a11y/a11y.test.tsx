import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ErrorMessage } from './ErrorMessage'
import { SkipLink } from './SkipLink'
import { VisuallyHidden } from './VisuallyHidden'

describe('a11y primitives', () => {
  it('SkipLink points at the main landmark', () => {
    render(<SkipLink />)
    const link = screen.getByRole('link', { name: /skip to main content/i })
    expect(link).toHaveAttribute('href', '#main-content')
  })

  it('ErrorMessage is an alert and links via id', () => {
    render(<ErrorMessage id="title-error">Title is required</ErrorMessage>)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveAttribute('id', 'title-error')
    expect(alert).toHaveTextContent('Title is required')
  })

  it('VisuallyHidden keeps its text in the accessibility tree', () => {
    render(<VisuallyHidden>context for screen readers</VisuallyHidden>)
    expect(screen.getByText('context for screen readers')).toBeInTheDocument()
  })
})
