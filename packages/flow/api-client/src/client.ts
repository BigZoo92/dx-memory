import { Cause, Duration, Effect, Exit, Option, Schedule } from 'effect'
import { API_ROUTES, isApiError, type ApiError } from '@signalops/contracts'
import {
  FlowApiError,
  FlowNetworkError,
  FlowTimeoutError,
  makeRequestId,
  toApiErrorPayload
} from '@signalops/flow-effect'
import { createLogger, getDefaultStore, getDefaultTrail } from '@signalops/flow-observability'
import { getDemoControls, SLOW_NETWORK_DELAY_MS } from './demo-controls'

/** Thrown when a request fails; carries the canonical `ApiError` envelope. This is the PUBLIC error
 *  type the UI consumes (`error.apiError.message` / `.requestId`) — kept identical so no screen
 *  changes. Effect is an internal implementation detail of how the request is orchestrated. */
export class ApiRequestError extends Error {
  readonly apiError: ApiError
  readonly status: number

  constructor(apiError: ApiError, status: number) {
    super(apiError.message)
    this.name = 'ApiRequestError'
    this.apiError = apiError
    this.status = status
  }
}

/** The typed failures the request pipeline can produce before they are turned into ApiRequestError. */
type ClientError = FlowApiError | FlowNetworkError | FlowTimeoutError

export type RequestOptions = {
  signal?: AbortSignal
  method?: 'GET' | 'POST'
  /** Total time budget for the request including retries. Defaults to 10s. */
  timeoutMs?: number
  /** Transient-network retry count. Defaults to 2 (so up to 3 attempts). */
  retries?: number
}

const DEFAULT_TIMEOUT_MS = 10_000
const DEFAULT_RETRIES = 2

// Client-side observability: structured events + breadcrumbs into the in-memory store the Ops surface
// reads. Framework-free core only (never the `/effect` adapter) so the client bundle stays tiny.
const clientLogger = createLogger({ store: getDefaultStore(), runtime: 'api-client' })
const breadcrumbs = getDefaultTrail()

/** Build a query string from a partial record, dropping empty values. */
export function toQueryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

/**
 * Apply the client-side demo controls as part of the request effect: delay it (slow network) and/or
 * fail it with a simulated `ApiError` (forced error). `/api/health` is exempt from the forced error
 * so the app shell's status indicator keeps working during the demo.
 */
function applyDemoControls(path: string, requestId: string): Effect.Effect<void, FlowApiError> {
  const { slowNetwork, forceError } = getDemoControls()
  const delay = slowNetwork ? Effect.sleep(Duration.millis(SLOW_NETWORK_DELAY_MS)) : Effect.void
  const fail =
    forceError && !path.startsWith(API_ROUTES.health)
      ? Effect.fail(
          new FlowApiError({
            requestId,
            status: 500,
            code: 'simulated_error',
            message: 'Simulated API error — widgets now show a partial-error state.'
          })
        )
      : Effect.void
  return Effect.zipRight(delay, fail)
}

/** `fetch` wrapped so a thrown transport error becomes a typed, retryable `FlowNetworkError`. */
function fetchEffect(
  path: string,
  requestId: string,
  options: RequestOptions
): Effect.Effect<Response, FlowNetworkError> {
  return Effect.tryPromise({
    try: () =>
      fetch(path, {
        method: options.method ?? 'GET',
        headers: { accept: 'application/json', 'x-request-id': requestId },
        signal: options.signal
      }),
    catch: (cause) =>
      new FlowNetworkError({
        requestId,
        message: cause instanceof Error ? cause.message : 'Network request failed',
        cause
      })
  })
}

/** Parse the response body and turn any non-2xx into a typed `FlowApiError` (envelope preserved). */
function parseResponse<A>(response: Response, requestId: string): Effect.Effect<A, FlowApiError> {
  return Effect.flatMap(
    Effect.promise(() =>
      response
        .json()
        .then((d: unknown) => d)
        .catch(() => null)
    ),
    (data) => {
      if (!response.ok) {
        if (isApiError(data)) {
          return Effect.fail(
            new FlowApiError({
              requestId: data.requestId,
              status: response.status,
              code: data.code,
              message: data.message,
              details: data.details
            })
          )
        }
        return Effect.fail(
          new FlowApiError({
            requestId,
            status: response.status,
            code: 'unknown',
            message: `Request failed (${response.status})`
          })
        )
      }
      return Effect.succeed(data as A)
    }
  )
}

const isNetworkError = (error: ClientError): boolean => error._tag === 'FlowNetworkError'

/** Reuse the SAME error → envelope mapping as the server so client and API stay byte-consistent. */
function toApiRequestError(error: ClientError): ApiRequestError {
  const { status, body } = toApiErrorPayload(error)
  return new ApiRequestError(body, status)
}

/**
 * The typed request pipeline: demo controls → fetch → parse, then a bounded transient-retry and a
 * total timeout. Retry is scoped to genuine network failures only (never a 4xx/5xx envelope, never
 * an aborted request), so it never masks a deterministic API error or fights TanStack Query's cache.
 */
export function requestEffect<A>(
  path: string,
  options: RequestOptions = {}
): Effect.Effect<A, ClientError> {
  const requestId = makeRequestId()
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const retries = options.retries ?? DEFAULT_RETRIES

  const method = options.method ?? 'GET'
  let attempts = 0
  breadcrumbs.add({ category: 'request', message: `request started ${method} ${path}` })

  const attempt = Effect.sync(() => {
    attempts += 1
  }).pipe(
    Effect.zipRight(applyDemoControls(path, requestId)),
    Effect.zipRight(fetchEffect(path, requestId, options)),
    Effect.flatMap((response) => parseResponse<A>(response, requestId))
  )

  return attempt.pipe(
    Effect.retry({
      while: (error: ClientError) => isNetworkError(error) && !options.signal?.aborted,
      schedule: Schedule.intersect(Schedule.exponential('100 millis'), Schedule.recurs(retries))
    }),
    Effect.timeoutFail({
      duration: Duration.millis(timeoutMs),
      onTimeout: () => new FlowTimeoutError({ requestId, timeoutMs })
    }),
    Effect.tap(() =>
      Effect.sync(() => {
        clientLogger.info('request completed', {
          requestId,
          route: path,
          method,
          retryCount: attempts - 1
        })
      })
    ),
    Effect.tapError((error: ClientError) =>
      Effect.sync(() => {
        const { status, body } = toApiErrorPayload(error)
        clientLogger.log(status >= 500 ? 'error' : 'warn', body.message, {
          requestId,
          route: path,
          method,
          status,
          errorTag: error._tag,
          errorCode: body.code,
          retryCount: attempts - 1
        })
        breadcrumbs.add({
          category: 'request',
          level: 'error',
          message: `request failed ${path} (${body.code})`
        })
      })
    )
  )
}

/** Run a request effect to a Promise, preserving the `ApiRequestError`/abort contract the hooks and
 *  TanStack Query expect. The `AbortSignal` interrupts the fiber (cancelling retries and the
 *  in-flight fetch). */
async function run<A>(effect: Effect.Effect<A, ClientError>, signal?: AbortSignal): Promise<A> {
  const exit = await Effect.runPromiseExit(effect, signal ? { signal } : undefined)
  if (Exit.isSuccess(exit)) return exit.value
  const failure = Cause.failureOption(exit.cause)
  if (Option.isSome(failure)) throw toApiRequestError(failure.value)
  if (Cause.isInterrupted(exit.cause))
    throw new DOMException('The request was aborted.', 'AbortError')
  throw Cause.squash(exit.cause)
}

export function apiGet<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return run(requestEffect<T>(path, { ...options, method: 'GET' }), options.signal)
}

export function apiPost<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return run(requestEffect<T>(path, { ...options, method: 'POST' }), options.signal)
}
