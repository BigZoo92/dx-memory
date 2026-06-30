import { Context } from 'effect'

/** Per-request context. Today it carries the correlation id; it is the natural seam for adding
 *  auth / tenant / locale later without threading extra arguments through every repository. */
export interface RequestContextService {
  readonly requestId: string
}

/**
 * Request-scoped service. Provided once at the API boundary (`runApiEffect`) with a fresh id, then
 * read by any error constructor deep in the call graph — so every `ApiError` carries the same
 * `requestId` as the server logs, with zero manual plumbing.
 */
export class RequestContext extends Context.Tag('@signalops/flow/RequestContext')<
  RequestContext,
  RequestContextService
>() {}
