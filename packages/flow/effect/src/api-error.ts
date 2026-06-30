import type { ApiError } from '@signalops/contracts'
import type { FlowError } from './errors'

/** A Flow error rendered for HTTP transport: the canonical `ApiError` envelope + a status code. */
export type ApiErrorPayload = {
  readonly status: number
  readonly body: ApiError
}

function envelope(code: string, message: string, requestId: string, details?: unknown): ApiError {
  return details === undefined
    ? { code, message, requestId }
    : { code, message, requestId, details }
}

/**
 * Map any Flow tagged error to its wire form. This is the ONE place the error→HTTP contract lives,
 * so the status code, the `code` string and the `requestId` stay consistent across every route.
 * Exhaustive over `FlowError._tag` — adding a new error variant is a compile error here until mapped.
 */
export function toApiErrorPayload(error: FlowError): ApiErrorPayload {
  switch (error._tag) {
    case 'FlowValidationError':
      return {
        status: 400,
        body: envelope('bad_request', error.message, error.requestId, error.details)
      }
    case 'FlowNotFoundError':
      return {
        status: 404,
        body: envelope('not_found', `${error.resource} not found: ${error.id}`, error.requestId)
      }
    case 'FlowApiError':
      return {
        status: error.status,
        body: envelope(error.code, error.message, error.requestId, error.details)
      }
    case 'FlowNetworkError':
      return {
        status: 502,
        body: envelope('network_error', error.message, error.requestId)
      }
    case 'FlowTimeoutError':
      return {
        status: 504,
        body: envelope('timeout', `Request timed out after ${error.timeoutMs}ms`, error.requestId)
      }
    case 'FlowUnexpectedError':
      return {
        status: 500,
        body: envelope('internal_error', error.message, error.requestId)
      }
  }
}
