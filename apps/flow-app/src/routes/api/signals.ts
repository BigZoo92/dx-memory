import '@tanstack/react-start/server-only'
import { createFileRoute } from '@tanstack/react-router'
import { getSignalsEffect } from '@signalops/flow-server-data-access'
import { handleEffect } from '../../server/respond'

export const Route = createFileRoute('/api/signals')({
  server: {
    handlers: {
      GET: ({ request }) => handleEffect(getSignalsEffect(new URL(request.url).searchParams))
    }
  }
})
