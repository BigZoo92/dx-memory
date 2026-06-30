import { createFileRoute } from '@tanstack/react-router'
import { IncidentsScreen } from '@signalops/flow-feature-incidents'

export const Route = createFileRoute('/incidents')({
  component: IncidentsScreen
})
