import '@tanstack/react-start/server-only'
import { createFileRoute } from '@tanstack/react-router'
import { resolveRequestId, simulatedError } from '@signalops/flow-server-data-access'
import { createLogger, getDefaultStore } from '@signalops/flow-observability'

// The demo error path is imperative (not an Effect), so it logs to the server store directly. This is
// what the Ops surface shows when a reviewer triggers "Simulate API error" from Settings.
const logger = createLogger({ store: getDefaultStore(), runtime: 'demo' })

export const Route = createFileRoute('/api/simulate-error')({
  server: {
    handlers: {
      // Always returns the canonical ApiError envelope with a 500 — drives the demo error state.
      POST: ({ request }) => {
        const requestId = resolveRequestId(request.headers.get('x-request-id'))
        const error = simulatedError()
        const body = { ...error.toApiError(), requestId }
        logger.error(body.message, {
          requestId,
          route: '/api/simulate-error',
          method: 'POST',
          status: error.httpStatus,
          errorCode: body.code
        })
        return Response.json(body, {
          status: error.httpStatus,
          headers: { 'x-request-id': requestId }
        })
      }
    }
  }
})
