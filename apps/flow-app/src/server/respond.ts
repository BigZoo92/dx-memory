import { runApiEffect, type ApiEffect } from '@signalops/flow-server-data-access'

/**
 * The single server-route boundary. It derives the per-request context from the incoming `Request`
 * (route, method, and a validated `X-Request-Id`), runs the effect through `runApiEffect`, then turns
 * the result into a JSON `Response` and echoes the correlation id on the `X-Request-Id` header so the
 * client, the API envelope and the server logs all share one id.
 *
 * Business logic and error mapping live in `@signalops/flow-server-data-access`; this helper owns only
 * the HTTP transport. The API never leaks a raw stack: unexpected defects become an opaque 500.
 */
export function handleEffect<A>(effect: ApiEffect<A>, request?: Request): Promise<Response> {
  const ctx = request
    ? {
        requestId: request.headers.get('x-request-id'),
        route: new URL(request.url).pathname,
        method: request.method
      }
    : {}

  return runApiEffect(effect, ctx).then((result) => {
    const response = result.ok
      ? Response.json(result.value)
      : Response.json(result.error, { status: result.status })
    response.headers.set('x-request-id', result.requestId)
    return response
  })
}
