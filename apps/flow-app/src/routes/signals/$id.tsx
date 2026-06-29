import { createFileRoute } from '@tanstack/react-router'
import { SignalDetailScreen } from '../../features/signals/SignalDetailScreen'

export const Route = createFileRoute('/signals/$id')({
  component: SignalDetailScreen
})
