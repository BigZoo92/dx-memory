import { createFileRoute } from '@tanstack/react-router'
import { buildCompareResponse } from '@signalops/flow-data-access'
import { handle } from '../../server/respond'

export const Route = createFileRoute('/api/compare/$id')({
  server: {
    handlers: {
      GET: ({ params }) => handle(() => buildCompareResponse(params.id))
    }
  }
})
