import '@tanstack/react-start/server-only'
import { createFileRoute } from '@tanstack/react-router'
import {
  FLOW_VARIANT,
  getDefaultStore,
  redactEvent,
  type FlowLogEvent,
  type FlowLogLevel
} from '@signalops/flow-observability'
import { resolveRequestId } from '@signalops/flow-server-data-access'

// Strictly bounded, local-first, memory-only demo endpoint. GET returns the server store; POST ingests
// a bounded batch of client events and RE-REDACTS every one at the boundary (never trust the payload).
const MAX_INGEST = 50

function isLevel(value: unknown): value is FlowLogLevel {
  return (
    value === 'debug' ||
    value === 'info' ||
    value === 'warn' ||
    value === 'error' ||
    value === 'fatal'
  )
}

export const Route = createFileRoute('/api/logs')({
  server: {
    handlers: {
      GET: ({ request }) => {
        const requestId = resolveRequestId(request.headers.get('x-request-id'))
        return Response.json(
          { logs: getDefaultStore().list() },
          { headers: { 'x-request-id': requestId } }
        )
      },
      POST: async ({ request }) => {
        const requestId = resolveRequestId(request.headers.get('x-request-id'))
        const store = getDefaultStore()
        let accepted = 0
        try {
          const body = (await request.json()) as { events?: unknown }
          const events = Array.isArray(body?.events) ? body.events.slice(-MAX_INGEST) : []
          for (const raw of events) {
            if (!raw || typeof raw !== 'object') continue
            const candidate = raw as Partial<FlowLogEvent>
            if (typeof candidate.message !== 'string' || !isLevel(candidate.level)) continue
            const safe = redactEvent({
              id: typeof candidate.id === 'string' ? candidate.id : `evt_ingested_${accepted}`,
              timestamp:
                typeof candidate.timestamp === 'string'
                  ? candidate.timestamp
                  : new Date().toISOString(),
              level: candidate.level,
              runtime: 'client',
              variant: FLOW_VARIANT,
              message: candidate.message,
              requestId: typeof candidate.requestId === 'string' ? candidate.requestId : undefined,
              route: typeof candidate.route === 'string' ? candidate.route : undefined,
              status: typeof candidate.status === 'number' ? candidate.status : undefined,
              errorTag: typeof candidate.errorTag === 'string' ? candidate.errorTag : undefined,
              errorCode: typeof candidate.errorCode === 'string' ? candidate.errorCode : undefined
            })
            store.add(safe)
            accepted += 1
          }
        } catch {
          // Malformed body: best-effort, bounded demo ingestion — ignore and report what was accepted.
        }
        return Response.json({ accepted }, { headers: { 'x-request-id': requestId } })
      }
    }
  }
})
