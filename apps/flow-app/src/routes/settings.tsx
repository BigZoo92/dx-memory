import { createFileRoute } from '@tanstack/react-router'
import { SettingsScreen } from '@signalops/flow-feature-settings'
import { VARIANT } from '../app/config'

export const Route = createFileRoute('/settings')({
  component: () => <SettingsScreen variant={VARIANT} />
})
