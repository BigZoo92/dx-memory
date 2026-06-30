import { Effect } from 'effect'
import { FlowNotFoundError, FlowValidationError } from '@signalops/flow-effect'
import { RequestContext } from './request-context'

/**
 * Request-scoped error constructors. They read the `requestId` from {@link RequestContext}, so a
 * repository can fail with `yield* failNotFound('signal', id)` and the resulting `ApiError` is
 * automatically correlated — no requestId is ever passed by hand on the call path.
 */
export const failNotFound = (
  resource: string,
  id: string
): Effect.Effect<never, FlowNotFoundError, RequestContext> =>
  Effect.flatMap(RequestContext, ({ requestId }) =>
    Effect.fail(new FlowNotFoundError({ requestId, resource, id }))
  )

export const failValidation = (
  message: string,
  details?: unknown
): Effect.Effect<never, FlowValidationError, RequestContext> =>
  Effect.flatMap(RequestContext, ({ requestId }) =>
    Effect.fail(new FlowValidationError({ requestId, message, details }))
  )
