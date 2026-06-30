import { Data } from 'effect'

/**
 * Flow's typed error channel.
 *
 * Every failure that can travel through an Effect in Flow is one of these `Data.TaggedError`s.
 * Tagged errors give us three things plain `Error`s don't:
 *   1. a stable `_tag` discriminant → exhaustive `Effect.catchTag(s)` with no `instanceof`;
 *   2. structured, serializable fields (never a leaked stack trace);
 *   3. a `requestId` on every error → one id correlates the client, the API envelope and the logs.
 *
 * The mapping from these to the canonical `ApiError` envelope of `@signalops/contracts` lives in
 * `./api-error.ts`, so the wire contract is owned in exactly one place.
 */

/** A query string / payload failed runtime validation (→ HTTP 400 `bad_request`). */
export class FlowValidationError extends Data.TaggedError('FlowValidationError')<{
  readonly requestId: string
  readonly message: string
  readonly details?: unknown
}> {}

/** A requested resource does not exist (→ HTTP 404 `not_found`). */
export class FlowNotFoundError extends Data.TaggedError('FlowNotFoundError')<{
  readonly requestId: string
  readonly resource: string
  readonly id: string
}> {}

/** The API returned a structured `ApiError` envelope on a non-2xx response (client-side). */
export class FlowApiError extends Data.TaggedError('FlowApiError')<{
  readonly requestId: string
  readonly status: number
  readonly code: string
  readonly message: string
  readonly details?: unknown
}> {}

/** The transport failed before a response was parsed (fetch threw, connection dropped). */
export class FlowNetworkError extends Data.TaggedError('FlowNetworkError')<{
  readonly requestId: string
  readonly message: string
  readonly cause?: unknown
}> {}

/** A request exceeded its time budget. */
export class FlowTimeoutError extends Data.TaggedError('FlowTimeoutError')<{
  readonly requestId: string
  readonly timeoutMs: number
}> {}

/** A genuinely unexpected defect — coerced to a 500 so the API never leaks an internal stack. */
export class FlowUnexpectedError extends Data.TaggedError('FlowUnexpectedError')<{
  readonly requestId: string
  readonly message: string
  readonly cause?: unknown
}> {}

/** The closed union of every error Flow models with Effect. */
export type FlowError =
  | FlowValidationError
  | FlowNotFoundError
  | FlowApiError
  | FlowNetworkError
  | FlowTimeoutError
  | FlowUnexpectedError
