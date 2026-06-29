import { randomUUID } from 'node:crypto'
import type { ApiError } from '@signalops/contracts'

/** Generate a unique request id for correlating an error response with server logs. */
export function createRequestId(): string {
  return `req_${randomUUID()}`
}

/**
 * Typed API error. Carries the canonical `ApiError` envelope (`code`, `message`, `requestId`,
 * `details?`) plus the HTTP status to use. Server routes catch this and serialize `toApiError()`.
 * Every error the API returns — including `POST /api/simulate-error` — goes through this type.
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

export function notFound(message: string, details?: unknown): ApiErrorException {
  return new ApiErrorException({ code: 'not_found', message, httpStatus: 404, details })
}

export function badRequest(message: string, details?: unknown): ApiErrorException {
  return new ApiErrorException({ code: 'bad_request', message, httpStatus: 400, details })
}

export function unauthorized(message = 'Unauthorized'): ApiErrorException {
  return new ApiErrorException({ code: 'unauthorized', message, httpStatus: 401 })
}

export function internalError(
  message = 'Internal server error',
  details?: unknown
): ApiErrorException {
  return new ApiErrorException({ code: 'internal_error', message, httpStatus: 500, details })
}

/** The controlled error returned by `POST /api/simulate-error`. */
export function simulatedError(): ApiErrorException {
  return new ApiErrorException({
    code: 'simulated_error',
    message: 'Simulated API error — widgets now show a partial-error state.',
    httpStatus: 500
  })
}
