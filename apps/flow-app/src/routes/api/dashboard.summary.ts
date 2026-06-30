import '@tanstack/react-start/server-only'
import { createFileRoute } from '@tanstack/react-router'
import { getDashboardSummaryEffect } from '@signalops/flow-server-data-access'
import { handleEffect } from '../../server/respond'

export const Route = createFileRoute('/api/dashboard/summary')({
  server: {
    handlers: {
      GET: () => handleEffect(getDashboardSummaryEffect())
    }
  }
})
