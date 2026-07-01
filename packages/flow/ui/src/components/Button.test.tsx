import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './Button'
import { Icon } from './Icon'

describe('Button accessibility', () => {
  it('takes its accessible name from aria-label for icon-only buttons (e.g. notifications)', () => {
    render(
      <Button variant="ghost" aria-label="Notifications (3)">
        <Icon name="bell" size={18} />
      </Button>
    )
    expect(screen.getByRole('button', { name: 'Notifications (3)' })).toBeInTheDocument()
  })
})
