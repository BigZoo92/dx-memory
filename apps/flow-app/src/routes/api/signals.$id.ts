import { createFileRoute } from '@tanstack/react-router'
import { getSignalById } from '@signalops/flow-data-access'
import { handle } from '../../server/respond'

export const Route = createFileRoute('/api/signals/$id')({
  server: {
    handlers: {
      GET: ({ params }) => handle(() => getSignalById(params.id))
    }
  }
})
