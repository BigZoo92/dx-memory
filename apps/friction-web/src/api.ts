// Tiny fetch wrapper. No react-query, no caching, no retry - each page calls this from a useEffect
// and keeps its own loading/error/data state. Error handling is best-effort.

import type { ApiError } from './types'

const BASE = (import.meta.env.VITE_API_BASE as string) || '/api'

// A demo flag toggled from Settings. When on, every read fails with a simulated error
// (except health). Kept in a module-level variable-good enough for a demo.
let forceError = false
export function setForceError(v: boolean) {
  forceError = v
}
export function isForceError() {
  return forceError
}

export async function apiGet<T>(path: string): Promise<T> {
  if (forceError && !path.startsWith('/health')) {
    throw {
      code: 'simulated_error',
      message: 'Simulated API error — widgets now show a partial-error state.',
      requestId: 'req_forced'
    } as ApiError
  }
  const res = await fetch(BASE + path)
  if (!res.ok) {
    let body: any = null
    try {
      body = await res.json()
    } catch {
      body = null
    }
    throw (body as ApiError) || { code: 'network_error', message: 'Request failed', requestId: '' }
  }
  return res.json() as Promise<T>
}

export async function apiPost<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path, { method: 'POST' })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw (body as ApiError) || { code: 'network_error', message: 'Request failed', requestId: '' }
  }
  return body as T
}
