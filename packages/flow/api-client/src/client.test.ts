import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiGet, ApiRequestError, toQueryString } from './client'
import { resetDemoControls, setDemoControl } from './demo-controls'

afterEach(() => {
  resetDemoControls()
  vi.unstubAllGlobals()
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

describe('toQueryString', () => {
  it('builds a query string and drops empty/undefined values', () => {
    expect(toQueryString({ search: 'auth', severity: 'high', status: '', page: undefined })).toBe(
      '?search=auth&severity=high'
    )
  })

  it('returns an empty string when there is nothing to encode', () => {
    expect(toQueryString({ a: '', b: undefined })).toBe('')
  })

  it('coerces numbers', () => {
    expect(toQueryString({ page: 2, pageSize: 100 })).toBe('?page=2&pageSize=100')
  })
})

describe('apiGet — success', () => {
  it('resolves the decoded JSON body on a 2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ items: [1, 2, 3] })))
    await expect(apiGet<{ items: number[] }>('/api/signals')).resolves.toEqual({ items: [1, 2, 3] })
  })
})

describe('apiGet — ApiError envelope', () => {
  it('throws ApiRequestError carrying the ApiError envelope on a non-2xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ code: 'not_found', message: 'nope', requestId: 'req_1' }, 404)
        )
    )
    await expect(apiGet('/api/signals/sig_x')).rejects.toMatchObject({
      status: 404,
      apiError: { code: 'not_found', requestId: 'req_1' }
    })
  })
})

describe('apiGet — network error + retry', () => {
  it('retries a transient network failure, then succeeds (3rd attempt)', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue(jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(apiGet<{ ok: boolean }>('/api/health')).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('surfaces a network_error envelope after retries are exhausted', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', fetchMock)
    await expect(apiGet('/api/health', { retries: 1 })).rejects.toMatchObject({
      apiError: { code: 'network_error' }
    })
    expect(fetchMock).toHaveBeenCalledTimes(2) // initial + 1 retry
  })
})

describe('apiGet — timeout', () => {
  it('fails with a timeout envelope when the request exceeds its budget', async () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise<Response>(() => {})))
    await expect(apiGet('/api/signals', { timeoutMs: 20 })).rejects.toMatchObject({
      apiError: { code: 'timeout' }
    })
  })
})

describe('apiGet — slow network simulation', () => {
  it('delays the request (a tight timeout trips before the slow delay completes)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)
    setDemoControl('slowNetwork', true)
    await expect(apiGet('/api/signals', { timeoutMs: 50 })).rejects.toMatchObject({
      apiError: { code: 'timeout' }
    })
    // The slow-network delay runs before fetch, so the timeout trips before fetch is reached.
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('apiGet — forced API error (demo control)', () => {
  it('rejects data requests with a simulated ApiRequestError (no fetch)', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    setDemoControl('forceError', true)
    await expect(apiGet('/api/signals')).rejects.toBeInstanceOf(ApiRequestError)
    await expect(apiGet('/api/signals')).rejects.toMatchObject({
      apiError: { code: 'simulated_error' }
    })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('exempts /api/health from the forced error so the app shell stays usable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ status: 'ok' })))
    setDemoControl('forceError', true)
    await expect(apiGet('/api/health')).resolves.toEqual({ status: 'ok' })
  })
})

describe('apiGet — AbortSignal', () => {
  it('threads the AbortSignal through to fetch (TanStack Query cancellation)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()
    await apiGet('/api/health', { signal: controller.signal })
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ signal: controller.signal })
  })

  it('rejects when the signal is already aborted', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ok: true })))
    const controller = new AbortController()
    controller.abort()
    await expect(apiGet('/api/health', { signal: controller.signal })).rejects.toBeDefined()
  })
})
