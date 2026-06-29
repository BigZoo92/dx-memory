import { createFileRoute } from '@tanstack/react-router'
import { parseIncidentsQuery, queryIncidents } from '@signalops/flow-data-access'
import { handle } from '../../server/respond'

export const Route = createFileRoute('/api/incidents')({
  server: {
    handlers: {
      GET: ({ request }) =>
        handle(() => {
          const query = parseIncidentsQuery(new URL(request.url).searchParams)
          return queryIncidents(query)
        })
    }
  }
})
