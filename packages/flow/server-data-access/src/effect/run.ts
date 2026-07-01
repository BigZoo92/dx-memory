import { Cause, Effect, Exit, Option } from 'effect'
import type { ApiError } from '@signalops/contracts'
import {
  FlowUnexpectedError,
  resolveRequestId,
  toApiErrorPayload,
  type FlowError
} from '@signalops/flow-effect'
import { createLogger, getDefaultStore } from '@signalops/flow-observability'
import { observabilityLoggerLayer } from '@signalops/flow-observability/effect'
import { ServerLive, type ApiRequirements } from './layers'
import { RequestContext } from './request-context'

/** A route-facing program: produces `A`, fails only with a typed {@link FlowError}, and may require
 *  any server service + the per-request context. The boundary (`runApiEffect`) satisfies both. */
export type ApiEffect<A> = Effect.Effect<A, FlowError, ApiRequirements>

/** The boundary result: a value or the wire form of a typed error, plus the correlation id (which is
 *  also echoed on the response `X-Request-Id` header by `handleEffect`). */
export type ApiRunResult<A> =
  | { readonly ok: true; readonly value: A; readonly requestId: string }
  | {
      readonly ok: false
      readonly status: number
      readonly error: ApiError
      readonly requestId: string
    }

/** Per-request context derived from the incoming HTTP request. `requestId` is never trusted raw. */
export type RunContext = {
  requestId?: string | null
  route?: string
  method?: string
}

// One logger + one Effect logger layer per process, both writing to the shared server store the Ops
// surface reads. The store is a bounded, in-memory ring buffer (no persistence, no SaaS).
const logger = createLogger({ store: getDefaultStore(), runtime: 'server' })
const loggerLayer = observabilityLoggerLayer(getDefaultStore(), 'server')

/**
 * Run an API effect at the server boundary. This is the single place where:
 *   - a `requestId` is resolved (a valid client `X-Request-Id` is reused, else a fresh one is minted);
 *   - the live service layer + the observability logger + the request context are provided;
 *   - success and typed failure are both logged (correlated by `requestId`, never a leaked stack);
 *   - any unexpected defect is coerced to an opaque 500 carrying the SAME requestId.
 */
export function runApiEffect<A>(
  effect: ApiEffect<A>,
  ctx: RunContext = {}
): Promise<ApiRunResult<A>> {
  const requestId = resolveRequestId(ctx.requestId)
  const startedAt = Date.now()
  const runnable = effect.pipe(
    Effect.provide(ServerLive),
    Effect.provide(loggerLayer),
    Effect.provideService(RequestContext, { requestId })
  )

  return Effect.runPromiseExit(runnable).then((exit) =>
    Exit.match(exit, {
      onSuccess: (value): ApiRunResult<A> => {
        logger.info('request completed', {
          requestId,
          route: ctx.route,
          method: ctx.method,
          status: 200,
          durationMs: Date.now() - startedAt
        })
        return { ok: true, value, requestId }
      },
      onFailure: (cause): ApiRunResult<A> => {
        const flowError: FlowError = Option.getOrElse(Cause.failureOption(cause), () => {
          // Defect or interruption: surface the message (never the stack) under a fresh 500.
          const defect = Cause.squash(cause)
          const message = defect instanceof Error ? defect.message : String(defect)
          return new FlowUnexpectedError({ requestId, message })
        })
        const { status, body } = toApiErrorPayload(flowError)
        logger.log(status >= 500 ? 'error' : 'warn', body.message, {
          requestId,
          route: ctx.route,
          method: ctx.method,
          status,
          errorTag: flowError._tag,
          errorCode: body.code,
          durationMs: Date.now() - startedAt
        })
        return { ok: false, status, error: body, requestId }
      }
    })
  )
}
