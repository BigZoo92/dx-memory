import '@tanstack/react-start/server-only'
import { createFileRoute } from '@tanstack/react-router'
import { getSignalByIdEffect } from '@signalops/flow-server-data-access'
import { handleEffect } from '../../server/respond'

export const Route = createFileRoute('/api/signals/$id')({
  server: {
    handlers: {
      GET: ({ params, request }) => handleEffect(getSignalByIdEffect(params.id), request)
    }
  }
})
