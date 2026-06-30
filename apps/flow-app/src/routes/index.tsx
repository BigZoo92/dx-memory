import { createFileRoute } from '@tanstack/react-router'
import { DashboardScreen } from '@signalops/flow-feature-dashboard'

export const Route = createFileRoute('/')({
  component: DashboardScreen
})
