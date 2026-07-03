/**
 * Tiny GitHub REST client used only by the GitHub collector.
 *
 * Robustness contract (so the metrics pipeline never hard-fails on GitHub):
 *   • Every call returns { ok, status, data, error, rateLimited } — it NEVER throws.
 *   • Rate-limit / abuse responses (403 with remaining=0, or 429) are detected and
 *     reported as `rateLimited` so the collector can stop early with a clean reason.
 *   • A short per-request timeout (via AbortController) keeps a hung API from stalling CI.
 *   • Uses the global `fetch` (Node ≥ 18). No third-party dependency.
 *
 * The token is only ever sent in the Authorization header to api.github.com. It is never
 * logged, returned, or written to any output file.
 */

export function createGithubClient({ token, apiBase = 'https://api.github.com', timeoutMs = 15000 } = {}) {
  const base = apiBase.replace(/\/$/, '')
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'signalops-metrics-collector'
  }
  if (token) headers.Authorization = `Bearer ${token}`

  let requestCount = 0
  let lastRateLimit = { remaining: null, limit: null, reset: null }

  async function request(path, { params } = {}) {
    requestCount++
    const url = new URL(path.startsWith('http') ? path : `${base}${path}`)
    if (params) for (const [k, v] of Object.entries(params)) if (v != null) url.searchParams.set(k, String(v))

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, { headers, signal: controller.signal })
      const remaining = res.headers.get('x-ratelimit-remaining')
      lastRateLimit = {
        remaining: remaining != null ? Number(remaining) : null,
        limit: res.headers.get('x-ratelimit-limit') != null ? Number(res.headers.get('x-ratelimit-limit')) : null,
        reset: res.headers.get('x-ratelimit-reset')
      }
      const rateLimited =
        res.status === 429 || (res.status === 403 && remaining === '0')

      let data = null
      const text = await res.text()
      if (text) {
        try {
          data = JSON.parse(text)
        } catch {
          data = null
        }
      }

      if (!res.ok) {
        const msg = data?.message || `HTTP ${res.status}`
        return { ok: false, status: res.status, data: null, error: msg, rateLimited }
      }
      return { ok: true, status: res.status, data, error: null, rateLimited: false }
    } catch (e) {
      const aborted = e?.name === 'AbortError'
      return {
        ok: false,
        status: 0,
        data: null,
        error: aborted ? `request timed out after ${timeoutMs}ms` : String(e?.message ?? e),
        rateLimited: false
      }
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * Fetch a paginated list endpoint whose payload is `{ [listKey]: [...] }`, stopping once
   * `limit` items are collected. Returns { ok, items, error, rateLimited, truncated }.
   */
  async function paginate(path, { listKey, limit = 30, perPage = 100, params = {} } = {}) {
    const items = []
    let page = 1
    let truncated = false
    while (items.length < limit) {
      const remaining = limit - items.length
      const res = await request(path, {
        params: { ...params, per_page: Math.min(perPage, remaining < perPage ? perPage : perPage), page }
      })
      if (!res.ok) return { ok: false, items, error: res.error, rateLimited: res.rateLimited, truncated }
      const batch = listKey ? res.data?.[listKey] : res.data
      if (!Array.isArray(batch) || batch.length === 0) break
      items.push(...batch)
      if (batch.length < perPage) break
      page++
      if (page > 50) {
        truncated = true
        break
      }
    }
    return { ok: true, items: items.slice(0, limit), error: null, rateLimited: false, truncated }
  }

  return {
    request,
    paginate,
    stats: () => ({ requestCount, lastRateLimit })
  }
}
