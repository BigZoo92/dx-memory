import { createFileRoute } from '@tanstack/react-router'
import { buildHealthResponse } from '@signalops/flow-data-access'
import { handle } from '../../server/respond'

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: () => handle(() => buildHealthResponse())
    }
  }
})
