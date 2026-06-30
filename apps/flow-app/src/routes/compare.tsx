import { createFileRoute } from '@tanstack/react-router'
import { CompareScreen } from '@signalops/flow-feature-compare'

export const Route = createFileRoute('/compare')({
  component: CompareScreen
})
