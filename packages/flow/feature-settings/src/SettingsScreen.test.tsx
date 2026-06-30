import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { resetDemoControls } from '@signalops/flow-api-client'
import { SettingsScreen, type SettingsVariant } from './SettingsScreen'

const variant: SettingsVariant = {
  id: 'flow',
  label: 'Variant B — Flow',
  datasetVersion: 'v2.4.0',
  region: 'eu-west-1'
}

function renderScreen() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }))
  )
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <SettingsScreen variant={variant} />
    </QueryClientProvider>
  )
}

afterEach(() => {
  resetDemoControls()
  vi.unstubAllGlobals()
})

describe('SettingsScreen demo controls', () => {
  it('shows the variant environment block', () => {
    renderScreen()
    expect(screen.getByText('v2.4.0')).toBeInTheDocument()
    expect(screen.getByText('Variant B — Flow')).toBeInTheDocument()
  })

  it('toggling "Simulate API error" flips the control and shows a banner', async () => {
    const user = userEvent.setup()
    renderScreen()
    const button = screen.getByRole('button', { name: 'Simulate API error' })
    await user.click(button)
    expect(screen.getByRole('button', { name: 'Stop API error' })).toBeInTheDocument()
    expect(screen.getByText(/partial-error state/i)).toBeInTheDocument()
  })

  it('"Reset demo state" clears the simulation and confirms', async () => {
    const user = userEvent.setup()
    renderScreen()
    await user.click(screen.getByRole('button', { name: 'Simulate API error' }))
    await user.click(screen.getByRole('button', { name: 'Reset demo state' }))
    expect(screen.getByRole('button', { name: 'Simulate API error' })).toBeInTheDocument()
    expect(screen.getByText(/reset to defaults/i)).toBeInTheDocument()
  })
})
