import { isApiError, type ApiError } from '@signalops/contracts'

/** Thrown when the API returns a non-2xx response; carries the canonical `ApiError` envelope. */
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

async function parse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as unknown
  if (!response.ok) {
    if (isApiError(data)) throw new ApiRequestError(data, response.status)
    throw new ApiRequestError(
      { code: 'unknown', message: `Request failed (${response.status})`, requestId: 'n/a' },
      response.status
    )
  }
  return data as T
}

/** Build a query string from a partial record, dropping empty values. */
export function toQueryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export async function apiGet<T>(path: string): Promise<T> {
  return parse<T>(await fetch(path, { headers: { accept: 'application/json' } }))
}

export async function apiPost<T>(path: string): Promise<T> {
  return parse<T>(await fetch(path, { method: 'POST', headers: { accept: 'application/json' } }))
}
