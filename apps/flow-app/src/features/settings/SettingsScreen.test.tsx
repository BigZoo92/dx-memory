import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SettingsScreen } from './SettingsScreen'

beforeEach(() => {
  // Stub /api/health so the Settings query resolves without a real server.
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            status: 'ok',
            version: '1.0.0',
            variant: 'Variant B — Flow',
            datasetVersion: 'v2.4.0',
            uptimeSeconds: 1
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
    )
  )
})

function withClient(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
}

describe('SettingsScreen', () => {
  it('renders the variant identity and the feature flags', () => {
    render(withClient(<SettingsScreen />))
    expect(screen.getByText('Variant B — Flow')).toBeTruthy()
    expect(screen.getByText('Feature flags')).toBeTruthy()
    expect(screen.getByText('AI recommendations')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Simulate API error' })).toBeTruthy()
  })
})
