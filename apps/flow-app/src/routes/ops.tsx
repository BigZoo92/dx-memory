import { createFileRoute } from '@tanstack/react-router'
import { OpsScreen } from '@signalops/flow-feature-ops'

export const Route = createFileRoute('/ops')({
  component: OpsScreen
})
