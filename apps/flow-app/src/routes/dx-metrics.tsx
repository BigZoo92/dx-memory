import { createFileRoute } from '@tanstack/react-router'
import { DxMetricsScreen } from '@signalops/flow-feature-dx-metrics'

export const Route = createFileRoute('/dx-metrics')({
  component: DxMetricsScreen
})
