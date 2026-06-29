import { createFileRoute } from '@tanstack/react-router'
import { IncidentsScreen } from '../features/incidents/IncidentsScreen'

export const Route = createFileRoute('/incidents')({
  component: IncidentsScreen
})
