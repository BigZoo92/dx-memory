import { createFileRoute } from '@tanstack/react-router'
import { DxMetricsScreen } from '../features/dx-metrics/DxMetricsScreen'

export const Route = createFileRoute('/dx-metrics')({
  component: DxMetricsScreen
})
