#!/usr/bin/env node

const baseUrl = (process.env.SMOKE_BASE_URL ?? 'https://dx-memory.enzogivernaud.fr').replace(/\/+$/, '')
const expectedRelease = process.env.SMOKE_EXPECTED_RELEASE_TAG

const checks = []

class SmokeFailure extends Error {
  constructor(name, url, expected, actual) {
    super(`[FAIL] ${name}\nURL: ${url}\nExpected: ${expected}\nActual: ${actual}`)
    this.name = 'SmokeFailure'
  }
}

function absolute(path) {
  return new URL(path, `${baseUrl}/`).toString()
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 10000)
  try {
    return await fetch(url, {
      method: options.method ?? 'GET',
      headers: { accept: options.accept ?? '*/*' },
      signal: controller.signal
    })
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchSmoke(name, url, options = {}) {
  try {
    return await fetchWithTimeout(url, options)
  } catch (cause) {
    const message = cause instanceof Error ? `${cause.name}: ${cause.message}` : String(cause)
    throw new SmokeFailure(name, url, 'fetch completed', message)
  }
}

async function check(name, fn) {
  const started = Date.now()
  await fn()
  checks.push({ name, durationMs: Date.now() - started })
  process.stdout.write(`[OK] ${name}\n`)
}

function expectOk(name, url, response) {
  if (!response.ok) {
    throw new SmokeFailure(name, url, '2xx', response.status)
  }
}

function expectHtml(name, url, response) {
  expectOk(name, url, response)
  const type = response.headers.get('content-type') ?? ''
  if (!type.includes('text/html')) {
    throw new SmokeFailure(name, url, 'content-type text/html', type || '(missing)')
  }
}

async function getHtml(name, path) {
  const url = absolute(path)
  const response = await fetchSmoke(name, url, { accept: 'text/html' })
  expectHtml(name, url, response)
  return { url, html: await response.text() }
}

function firstLocalAsset(pageUrl, html) {
  const candidates = []
  const attrRe = /<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["'][^>]*>/gi
  let match
  while ((match = attrRe.exec(html))) {
    const raw = match[1]
    if (!raw || raw.startsWith('data:') || raw.startsWith('mailto:') || raw.startsWith('tel:')) continue
    const url = new URL(raw, pageUrl)
    if (url.origin !== new URL(baseUrl).origin) continue
    if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) candidates.push(url.toString())
  }
  return candidates[0]
}

async function checkPageAsset(name, pagePath) {
  const { url, html } = await getHtml(`${name} page`, pagePath)
  const asset = firstLocalAsset(url, html)
  if (!asset) throw new SmokeFailure(`${name} assets`, url, 'at least one local JS or CSS asset', 'none found')
  const response = await fetchSmoke(`${name} assets`, asset)
  expectOk(`${name} assets`, asset, response)
}

await check('gateway health', async () => {
  const url = absolute('/health')
  const response = await fetchSmoke('gateway health', url, { accept: 'application/json' })
  expectOk('gateway health', url, response)
  const body = await response.json().catch(() => null)
  if (body?.status !== 'ok') {
    throw new SmokeFailure('gateway health', url, 'JSON status === ok', JSON.stringify(body))
  }
})

await check('release metadata', async () => {
  const url = absolute('/release.json')
  const response = await fetchSmoke('release metadata', url, { accept: 'application/json' })
  expectOk('release metadata', url, response)
  const body = await response.json().catch(() => null)
  if (!body || typeof body.version !== 'string') {
    throw new SmokeFailure('release metadata', url, 'JSON with version', JSON.stringify(body))
  }
  if (expectedRelease && body.version !== expectedRelease) {
    throw new SmokeFailure('release metadata', url, `version === ${expectedRelease}`, body.version)
  }
})

await check('lab shell', async () => {
  const { url, html } = await getHtml('lab shell', '/')
  if (!html.includes('data-app="dx-memory-lab"') || !html.includes('DX MEMORY')) {
    throw new SmokeFailure('lab shell', url, 'DX Memory marker', 'marker missing')
  }
})

const pages = [
  ['flow', '/flow/'],
  ['friction', '/friction/'],
  ['overfit', '/overfit/'],
  ['metrics', '/metrics/']
]

for (const [name, path] of pages) {
  await check(`${name} page`, async () => {
    await getHtml(`${name} page`, path)
  })
}

for (const [name, path] of [['lab', '/'], ...pages]) {
  await check(`${name} assets`, async () => {
    await checkPageAsset(name, path)
  })
}

const deepLinks = [
  ['flow deep link', '/flow/signals'],
  ['friction deep link', '/friction/signals'],
  ['overfit deep link', '/overfit/signals'],
  ['metrics hash view', '/metrics/#build']
]

for (const [name, path] of deepLinks) {
  await check(name, async () => {
    await getHtml(name, path)
  })
}

const healthz = ['/healthz/flow', '/healthz/friction', '/healthz/overfit', '/healthz/metrics']
for (const path of healthz) {
  await check(path, async () => {
    const url = absolute(path)
    const response = await fetchSmoke(path, url)
    expectOk(path, url, response)
  })
}

const apiHealth = ['/api/flow/health', '/api/friction/health', '/api/overfit/health']
for (const path of apiHealth) {
  await check(path, async () => {
    const url = absolute(path)
    const response = await fetchSmoke(path, url, { accept: 'application/json' })
    expectOk(path, url, response)
    const body = await response.json().catch(() => null)
    if (body?.status !== 'ok') {
      throw new SmokeFailure(path, url, 'JSON status === ok', JSON.stringify(body))
    }
  })
}

process.stdout.write(`DX Memory production smoke passed.\nRelease: ${expectedRelease ?? 'not asserted'}\n`)
