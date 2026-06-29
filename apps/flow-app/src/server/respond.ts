import { ApiErrorException, internalError } from '@signalops/flow-data-access'

/**
 * Wrap a server-route handler so every response is JSON and every failure becomes the canonical
 * `ApiError` envelope with the right HTTP status. `ApiErrorException`s carry their own status;
 * anything else is coerced to a 500 with a fresh requestId — the API never leaks a raw stack.
 */
export async function handle<T>(fn: () => T | Promise<T>): Promise<Response> {
  try {
    return Response.json(await fn())
  } catch (error) {
    const apiError =
      error instanceof ApiErrorException
        ? error
        : internalError(String((error as Error)?.message ?? error))
    return Response.json(apiError.toApiError(), { status: apiError.httpStatus })
  }
}
