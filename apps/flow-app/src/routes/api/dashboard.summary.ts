import { createFileRoute } from '@tanstack/react-router'
import { buildDashboardSummary } from '@signalops/flow-data-access'
import { handle } from '../../server/respond'

export const Route = createFileRoute('/api/dashboard/summary')({
  server: {
    handlers: {
      GET: () => handle(() => buildDashboardSummary())
    }
  }
})
