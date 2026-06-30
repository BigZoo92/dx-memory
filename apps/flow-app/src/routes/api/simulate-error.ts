import '@tanstack/react-start/server-only'
import { createFileRoute } from '@tanstack/react-router'
import { simulatedError } from '@signalops/flow-server-data-access'

export const Route = createFileRoute('/api/simulate-error')({
  server: {
    handlers: {
      // Always returns the canonical ApiError envelope with a 500 — drives the demo error state.
      POST: () => {
        const error = simulatedError()
        return Response.json(error.toApiError(), { status: error.httpStatus })
      }
    }
  }
})
