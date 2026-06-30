import '@tanstack/react-start/server-only'
import { createFileRoute } from '@tanstack/react-router'
import { getCompareEffect } from '@signalops/flow-server-data-access'
import { handleEffect } from '../../server/respond'

export const Route = createFileRoute('/api/compare/$id')({
  server: {
    handlers: {
      GET: ({ params }) => handleEffect(getCompareEffect(params.id))
    }
  }
})
