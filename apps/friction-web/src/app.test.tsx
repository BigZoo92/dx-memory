import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { App } from './App'

// Shallow smoke test: the shell renders and the product nav is present. fetch is stubbed so the
// layout's health/summary calls resolve instead of hanging into teardown.
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new Error('no network in test')
    })
  )
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('App shell', () => {
  it('renders the brand and product nav', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )
    expect(screen.getAllByText(/SignalOps/).length).toBeGreaterThan(0)
    expect(screen.getByText('Overview')).toBeTruthy()
    expect(screen.getByText('Signals')).toBeTruthy()
    expect(screen.getByText('DX Metrics')).toBeTruthy()
  })

  it('shows the variant label', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )
    expect(screen.getByText('Variant A — Friction')).toBeTruthy()
  })
})
