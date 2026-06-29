import { createFileRoute } from '@tanstack/react-router'
import { getSignalEvents } from '@signalops/flow-data-access'
import { handle } from '../../server/respond'

export const Route = createFileRoute('/api/signals/$id/events')({
  server: {
    handlers: {
      GET: ({ params }) => handle(() => getSignalEvents(params.id))
    }
  }
})
