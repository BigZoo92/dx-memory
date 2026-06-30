import { Cause, Effect, Exit, Option } from 'effect'
import type { ApiError } from '@signalops/contracts'
import {
  FlowUnexpectedError,
  makeRequestId,
  toApiErrorPayload,
  type FlowError
} from '@signalops/flow-effect'
import { ServerLive, type ApiRequirements } from './layers'
import { RequestContext } from './request-context'

/** A route-facing program: produces `A`, fails only with a typed {@link FlowError}, and may require
 *  any server service + the per-request context. The boundary (`runApiEffect`) satisfies both. */
export type ApiEffect<A> = Effect.Effect<A, FlowError, ApiRequirements>

/** The boundary result: either a value or the wire form of a typed error (envelope + status). */
export type ApiRunResult<A> =
  | { readonly ok: true; readonly value: A }
  | { readonly ok: false; readonly status: number; readonly error: ApiError }

/**
 * Run an API effect at the server boundary. This is the single place where:
 *   - the live service layer is provided (`ServerLive`);
 *   - a fresh `requestId` is minted and injected via {@link RequestContext};
 *   - typed failures are mapped to the `ApiError` envelope (`toApiErrorPayload`);
 *   - any unexpected defect is coerced to an opaque 500 carrying the SAME requestId — the API never
 *     leaks a stack trace.
 *
 * The TanStack Start route then only has to turn this result into a `Response` (see the app's
 * `handleEffect`), keeping HTTP transport and business logic cleanly separated.
 */
export function runApiEffect<A>(effect: ApiEffect<A>): Promise<ApiRunResult<A>> {
  const requestId = makeRequestId()
  const runnable = effect.pipe(
    Effect.provide(ServerLive),
    Effect.provideService(RequestContext, { requestId })
  )

  return Effect.runPromiseExit(runnable).then((exit) =>
    Exit.match(exit, {
      onSuccess: (value): ApiRunResult<A> => ({ ok: true, value }),
      onFailure: (cause): ApiRunResult<A> => {
        const flowError: FlowError = Option.getOrElse(Cause.failureOption(cause), () => {
          // Defect or interruption: surface the message (never the stack) under a fresh 500.
          const defect = Cause.squash(cause)
          const message = defect instanceof Error ? defect.message : String(defect)
          return new FlowUnexpectedError({ requestId, message })
        })
        const { status, body } = toApiErrorPayload(flowError)
        return { ok: false, status, error: body }
      }
    })
  )
}
