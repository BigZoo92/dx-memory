import '@tanstack/react-start/server-only'
import { createFileRoute } from '@tanstack/react-router'
import { getHealthEffect } from '@signalops/flow-server-data-access'
import { handleEffect } from '../../server/respond'

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: ({ request }) => handleEffect(getHealthEffect(), request)
    }
  }
})
