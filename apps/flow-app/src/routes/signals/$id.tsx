import { createFileRoute } from '@tanstack/react-router'
import { SignalDetailScreen } from '@signalops/flow-feature-signal-detail'

export const Route = createFileRoute('/signals/$id')({
  component: SignalDetailRoute
})

function SignalDetailRoute() {
  const { id } = Route.useParams()
  return <SignalDetailScreen signalId={id} />
}
