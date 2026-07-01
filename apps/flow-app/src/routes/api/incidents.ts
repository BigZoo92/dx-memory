import '@tanstack/react-start/server-only'
import { createFileRoute } from '@tanstack/react-router'
import { getIncidentsEffect } from '@signalops/flow-server-data-access'
import { handleEffect } from '../../server/respond'

export const Route = createFileRoute('/api/incidents')({
  server: {
    handlers: {
      GET: ({ request }) =>
        handleEffect(getIncidentsEffect(new URL(request.url).searchParams), request)
    }
  }
})
