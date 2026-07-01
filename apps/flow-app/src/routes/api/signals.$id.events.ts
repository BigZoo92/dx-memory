import '@tanstack/react-start/server-only'
import { createFileRoute } from '@tanstack/react-router'
import { getSignalEventsEffect } from '@signalops/flow-server-data-access'
import { handleEffect } from '../../server/respond'

export const Route = createFileRoute('/api/signals/$id/events')({
  server: {
    handlers: {
      GET: ({ params, request }) => handleEffect(getSignalEventsEffect(params.id), request)
    }
  }
})
