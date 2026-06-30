import { runApiEffect, type ApiEffect } from '@signalops/flow-server-data-access'

/**
 * The single server-route boundary. It runs a route-facing Effect through `runApiEffect` (which
 * provides the live service layer + a fresh request context and maps any typed failure to the
 * canonical `ApiError`), then turns that result into a JSON `Response` with the right status.
 *
 * Business logic and error mapping live in `@signalops/flow-server-data-access`; this helper owns
 * only the HTTP transport. The API never leaks a raw stack: unexpected defects become an opaque 500
 * carrying the request id (see `runApiEffect`).
 */
export function handleEffect<A>(effect: ApiEffect<A>): Promise<Response> {
  return runApiEffect(effect).then((result) =>
    result.ok ? Response.json(result.value) : Response.json(result.error, { status: result.status })
  )
}
