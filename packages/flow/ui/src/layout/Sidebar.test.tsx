import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Sidebar, type NavItem } from './Sidebar'

const items: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: 'overview', href: '/' },
  { id: 'signals', label: 'Signals', icon: 'signals', href: '/signals', count: '12' }
]

describe('Sidebar accessibility', () => {
  it('marks the active nav link with aria-current="page" and leaves the others unmarked', () => {
    render(
      <Sidebar
        variantLabel="Flow"
        items={items}
        activeId="signals"
        renderLink={(item, content, className, active) => (
          <a href={item.href} className={className} aria-current={active ? 'page' : undefined}>
            {content}
          </a>
        )}
      />
    )
    expect(screen.getByRole('link', { name: /signals/i })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /overview/i })).not.toHaveAttribute('aria-current')
  })

  it('exposes a named primary navigation landmark', () => {
    render(
      <Sidebar
        variantLabel="Flow"
        items={items}
        activeId="overview"
        renderLink={(item, content, className) => (
          <a href={item.href} className={className}>
            {content}
          </a>
        )}
      />
    )
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
  })
})
