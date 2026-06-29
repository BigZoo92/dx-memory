import { createFileRoute } from '@tanstack/react-router'
import { parseSignalsQuery, querySignals } from '@signalops/flow-data-access'
import { handle } from '../../server/respond'

export const Route = createFileRoute('/api/signals')({
  server: {
    handlers: {
      GET: ({ request }) =>
        handle(() => {
          const query = parseSignalsQuery(new URL(request.url).searchParams)
          return querySignals(query)
        })
    }
  }
})
