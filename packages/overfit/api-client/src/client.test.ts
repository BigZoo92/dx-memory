import { describe, expect, it } from 'vitest'
import { normalizeError, OverfitApiClient } from './index'

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body
  } as unknown as Response
}

const signalsPage = {
  items: [
    {
      id: 'sig_00001',
      title: 't',
      description: 'd',
      severity: 'critical',
      status: 'new',
      source: 'partner',
      confidence: 0.5,
      riskScore: 90,
      riskTrend: 'up',
      region: 'EU-West',
      assignedTo: null,
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-02T00:00:00.000Z',
      tags: ['auth'],
      hasLinkedIncident: false
    }
  ],
  page: 1,
  pageSize: 50,
  total: 1,
  totalPages: 1
}

describe('OverfitApiClient', () => {
  it('validates and returns signals', async () => {
    const client = new OverfitApiClient({
      baseUrl: '/api',
      fetchImpl: async () => jsonResponse(signalsPage)
    })
    const page = await client.listSignals({ riskTrend: 'up' })
    expect(page.items[0].riskTrend).toBe('up')
  })

  it('normalizes a non-ok response into ApiError', async () => {
    const err = { code: 'not_found', message: 'gone', requestId: 'req_1' }
    const client = new OverfitApiClient({
      baseUrl: '/api',
      fetchImpl: async () => jsonResponse(err, false, 404)
    })
    await expect(client.getSignal('sig_x')).rejects.toMatchObject({ code: 'not_found' })
  })

  it('normalizeError wraps unknown errors', () => {
    const e = normalizeError(new Error('boom'), 'web_1')
    expect(e.code).toBe('network_error')
    expect(e.requestId).toBe('web_1')
  })

  // Regression: the default client must invoke the global fetch with its binding preserved.
  // A browser's `window.fetch` throws "Illegal invocation" when called with the wrong receiver
  // (e.g. as a method on the client). We simulate that strict receiver check here.
  it('default client calls global fetch with a preserved binding (no Illegal invocation)', async () => {
    const original = globalThis.fetch
    const strictFetch = function (this: unknown): Promise<Response> {
      if (this !== undefined && this !== globalThis) {
        throw new TypeError("Failed to execute 'fetch' on 'Window': Illegal invocation")
      }
      return Promise.resolve(
        jsonResponse({ status: 'ok', version: '0.1.0', variant: 'Variant C', datasetVersion: 'v2.4.0', uptimeSeconds: 1 })
      )
    }
    globalThis.fetch = strictFetch as unknown as typeof fetch
    try {
      const client = new OverfitApiClient({ baseUrl: '/api' }) // no injected fetch -> default wrapper
      await expect(client.getHealth()).resolves.toMatchObject({ status: 'ok' })
    } finally {
      globalThis.fetch = original
    }
  })
})
