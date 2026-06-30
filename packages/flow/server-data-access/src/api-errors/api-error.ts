import type { ApiError } from '@signalops/contracts'
import { makeRequestId } from '@signalops/flow-effect'

/**
 * Generate a unique request id. Delegates to `@signalops/flow-effect` so the id format is identical
 * on the server, on the client and inside every Effect error.
 */
export function createRequestId(): string {
  return makeRequestId()
}

/**
 * Typed API error for the few NON-Effect code paths that still throw (today: `POST
 * /api/simulate-error`). Carries the canonical `ApiError` envelope plus the HTTP status.
 *
 * NOTE: the Effect data paths (repositories, services, query parsing) do NOT use this — they fail
 * with the typed `Flow*Error`s from `@signalops/flow-effect`, which `runApiEffect` maps to the same
 * `ApiError` envelope. This class remains for the handful of imperative endpoints.
 */
export class ApiErrorException extends Error {
  readonly code: string
  readonly httpStatus: number
  readonly requestId: string
  readonly details?: unknown

  constructor(args: {
    code: string
    message: string
    httpStatus: number
    requestId?: string
    details?: unknown
  }) {
    super(args.message)
    this.name = 'ApiErrorException'
    this.code = args.code
    this.httpStatus = args.httpStatus
    this.requestId = args.requestId ?? createRequestId()
    this.details = args.details
  }

  /** The serializable envelope sent to the client (matches `@signalops/contracts` `ApiError`). */
  toApiError(): ApiError {
    return {
      code: this.code,
      message: this.message,
      requestId: this.requestId,
      ...(this.details === undefined ? {} : { details: this.details })
    }
  }
}

/** The controlled error returned by `POST /api/simulate-error`. */
export function simulatedError(): ApiErrorException {
  return new ApiErrorException({
    code: 'simulated_error',
    message: 'Simulated API error — widgets now show a partial-error state.',
    httpStatus: 500
  })
}
