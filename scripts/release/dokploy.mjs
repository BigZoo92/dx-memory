#!/usr/bin/env node
/**
 * Dokploy release driver: sync (update env) -> deploy (trigger + best-effort status) ->
 * wait-public (authoritative: public gateway serves the expected release) -> smoke.
 *
 * Robustness rules baked in:
 *  - API base is normalized to exactly one `/api` (see normalizeDokployApiBase) so a
 *    DOKPLOY_URL of https://host, https://host/, https://host/api or https://host/api/ all
 *    resolve to https://host/api. `/api/api/...` is impossible.
 *  - The Compose is resolved DETERMINISTICALLY: prefer DOKPLOY_COMPOSE_NAME (stable identity,
 *    resolved to a composeId via project.all); fall back to DOKPLOY_COMPOSE_ID (validated).
 *    On a 404 we print a sanitized inventory instead of guessing. Never picks arbitrarily.
 *  - Only the managed release env keys are patched; every other Dokploy env line is preserved.
 *  - Rich, secret-free HTTP diagnostics (operation/method/path/status/code/message).
 *  - Retries only transient statuses (429/502/503/504) + network errors. Never 4xx.
 *
 * Pure helpers (normalizeDokployApiBase, patchComposeEnv, selectComposeCandidate, maskId) are
 * exported and unit-tested in dokploy.test.mjs — they run with no secrets and no network.
 */
import { readFileSync } from 'node:fs'

/* ----------------------------------------------------------------- pure helpers */

/** Canonical Dokploy API base: strip trailing slashes, drop a trailing /api, append one /api. */
export function normalizeDokployApiBase(rawUrl) {
  const trimmed = String(rawUrl ?? '').trim().replace(/\/+$/, '')
  if (!trimmed) throw new Error('DOKPLOY_URL is empty.')
  const withoutApi = trimmed.replace(/\/api$/i, '')
  return `${withoutApi}/api`
}

/** Patch only the managed keys of a dotenv-style string; preserve every other line verbatim. */
export function patchComposeEnv(existing, patch) {
  const raw = String(existing ?? '')
  const lines = raw.trim() === '' ? [] : raw.split(/\r?\n/)
  const applied = new Set()
  const out = lines.map((line) => {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=/)
    if (!m) return line // comment, blank, or non-release key -> preserved
    const key = m[1]
    if (!(key in patch)) return line // unmanaged var -> preserved (secrets, domains, URLs…)
    applied.add(key)
    return `${key}=${patch[key]}`
  })
  for (const [key, value] of Object.entries(patch)) {
    if (!applied.has(key)) out.push(`${key}=${value}`)
  }
  while (out.length && out[out.length - 1] === '') out.pop()
  return out.join('\n')
}

/** Collect every {project,name,appName,composeId} across a project.all payload (schema-tolerant). */
export function collectComposes(projectAll) {
  const root = Array.isArray(projectAll)
    ? projectAll
    : (projectAll?.data ?? projectAll?.result ?? projectAll?.projects ?? [])
  const projects = Array.isArray(root) ? root : []
  const out = []
  for (const project of projects) {
    if (!project || typeof project !== 'object') continue
    const projectName = project.name ?? null
    for (const value of Object.values(project)) {
      if (!Array.isArray(value)) continue
      for (const item of value) {
        if (item && typeof item === 'object' && typeof item.composeId === 'string' && item.composeId) {
          out.push({ project: projectName, name: item.name ?? null, appName: item.appName ?? null, composeId: item.composeId })
        }
      }
    }
  }
  return out
}

/** Deterministic exact-match resolution by compose name/appName. Never fuzzy, never arbitrary. */
export function selectComposeCandidate(projectAll, name) {
  const all = collectComposes(projectAll)
  const matches = all.filter((c) => c.name === name || c.appName === name)
  if (matches.length === 1) return { status: 'ok', composeId: matches[0].composeId, match: matches[0] }
  if (matches.length === 0) return { status: 'none', inventory: all }
  return { status: 'ambiguous', matches }
}

/** Mask an id for logs: abcd…wxyz (never print secrets, but a masked composeId aids debugging). */
export function maskId(id) {
  const s = String(id ?? '')
  if (s.length <= 8) return s ? `${s.slice(0, 2)}…` : '(unset)'
  return `${s.slice(0, 4)}…${s.slice(-4)}`
}

/* ----------------------------------------------------------------- runtime (CLI) */

class DokployApiError extends Error {
  constructor({ operation, method, pathname, status, code, message }) {
    super(
      `Dokploy API error\n  operation: ${operation}\n  method: ${method}\n  path: ${pathname}\n` +
        `  status: ${status}\n  code: ${code ?? '(none)'}\n  message: ${message ?? '(none)'}`
    )
    this.name = 'DokployApiError'
    this.status = status
    this.code = code
  }
}

const RETRYABLE = new Set([429, 502, 503, 504])
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const command = process.argv[2]
  if (!command || !['sync', 'deploy', 'wait-public'].includes(command)) {
    throw new Error('Usage: node scripts/release/dokploy.mjs <sync|deploy|wait-public>')
  }

  const smokeBaseUrl = (process.env.SMOKE_BASE_URL ?? 'https://dx-memory.enzogivernaud.fr').replace(/\/+$/, '')
  if (command === 'wait-public') {
    await waitPublic(smokeBaseUrl, process.env.APP_VERSION)
    return
  }

  // sync / deploy need the Dokploy API + release metadata.
  const apiBase = normalizeDokployApiBase(requiredEnv('DOKPLOY_URL'))
  const apiKey = requiredEnv('DOKPLOY_API_KEY')
  const composePath = process.env.DOKPLOY_COMPOSE_FILE ?? 'docker-compose.prod.yml'
  const releaseEnv = {
    GHCR_IMAGE_NAME: requiredEnv('GHCR_IMAGE_NAME'),
    APP_IMAGE_TAG: requiredEnv('APP_IMAGE_TAG'),
    APP_VERSION: requiredEnv('APP_VERSION'),
    APP_COMMIT_SHA: requiredEnv('APP_COMMIT_SHA'),
    APP_BUILD_TIME: requiredEnv('APP_BUILD_TIME')
  }

  async function api(op, { method = 'POST', query, body, operation, retries = 3 } = {}) {
    const url = new URL(`${apiBase}/${op}`)
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
      }
    }
    const headers = { accept: 'application/json', 'x-api-key': apiKey }
    const init = { method, headers }
    if (method !== 'GET') {
      headers['content-type'] = 'application/json'
      init.body = JSON.stringify(body ?? {})
    }
    let lastError
    for (let attempt = 1; attempt <= retries; attempt += 1) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 20000)
      try {
        const response = await fetch(url, { ...init, signal: controller.signal })
        if (response.ok) return await response.json().catch(() => ({}))
        const errBody = await response.json().catch(() => null)
        const apiError = new DokployApiError({
          operation: operation ?? op,
          method,
          pathname: url.pathname,
          status: response.status,
          code: errBody?.code,
          message: errBody?.message
        })
        if (RETRYABLE.has(response.status) && attempt < retries) {
          lastError = apiError
          await sleep(1500 * attempt)
          continue
        }
        throw apiError // 4xx (incl. 404) and non-retryable 5xx fail immediately
      } catch (error) {
        if (error instanceof DokployApiError) throw error
        // network/abort: transient — retry
        lastError = error
        if (attempt < retries) await sleep(1500 * attempt)
      } finally {
        clearTimeout(timeout)
      }
    }
    throw lastError
  }

  const pick = (p) => p?.compose ?? p?.data ?? p?.result ?? p

  async function inventoryLine() {
    try {
      const projects = await api('project.all', { method: 'GET', operation: 'list composes (diagnostic)' })
      const all = collectComposes(pick(projects) ?? projects)
      if (!all.length) return '  (no compose services visible to this API key)'
      return all.map((c) => `  - name=${c.name ?? '(none)'} appName=${c.appName ?? '(none)'} project=${c.project ?? '(none)'} composeId=${maskId(c.composeId)}`).join('\n')
    } catch (e) {
      return `  (could not list projects: ${e instanceof DokployApiError ? `${e.status} ${e.code ?? ''}` : 'network error'})`
    }
  }

  // Deterministic compose resolution. NAME (stable) preferred; ID validated as fallback.
  async function resolveComposeId() {
    const name = process.env.DOKPLOY_COMPOSE_NAME?.trim()
    const id = process.env.DOKPLOY_COMPOSE_ID?.trim()
    if (name) {
      const projects = await api('project.all', { method: 'GET', operation: 'resolve compose by name' })
      const r = selectComposeCandidate(pick(projects) ?? projects, name)
      if (r.status === 'ok') {
        process.stdout.write(`Resolved compose "${name}" -> composeId ${maskId(r.composeId)}\n`)
        return r.composeId
      }
      if (r.status === 'ambiguous') {
        throw new Error(`DOKPLOY_COMPOSE_NAME="${name}" is ambiguous (${r.matches.length} matches). Rename or use DOKPLOY_COMPOSE_ID.`)
      }
      const inv = r.inventory.length
        ? r.inventory.map((c) => `  - name=${c.name ?? '(none)'} appName=${c.appName ?? '(none)'} composeId=${maskId(c.composeId)}`).join('\n')
        : '  (no compose services visible to this API key)'
      throw new Error(`No Dokploy compose named "${name}". Available composes:\n${inv}`)
    }
    if (id) {
      try {
        await api('compose.one', { method: 'GET', query: { composeId: id }, operation: 'validate DOKPLOY_COMPOSE_ID' })
        return id
      } catch (e) {
        if (e instanceof DokployApiError && e.status === 404) {
          throw new Error(
            `DOKPLOY_COMPOSE_ID ${maskId(id)} not found (404 ${e.code ?? 'NOT_FOUND'}). The compose was likely removed/recreated.\n` +
              `Set the repo variable DOKPLOY_COMPOSE_NAME to auto-resolve. Available composes:\n${await inventoryLine()}`
          )
        }
        throw e
      }
    }
    throw new Error('Set DOKPLOY_COMPOSE_NAME (recommended) or DOKPLOY_COMPOSE_ID.')
  }

  if (command === 'sync') await sync({ api, pick, resolveComposeId, composePath, releaseEnv })
  if (command === 'deploy') await deploy({ api, resolveComposeId, releaseEnv })
}

async function sync({ api, pick, resolveComposeId, composePath, releaseEnv }) {
  const composeId = await resolveComposeId()
  const composeFile = readFileSync(composePath, 'utf8')

  const before = pick(await api('compose.one', { method: 'GET', query: { composeId }, operation: 'read compose' }))
  const env = patchComposeEnv(before?.env ?? before?.environment ?? '', releaseEnv)

  await api('compose.update', {
    body: { composeId, sourceType: 'raw', composeFile, env },
    operation: 'update compose'
  })

  const after = pick(await api('compose.one', { method: 'GET', query: { composeId }, operation: 'verify compose' }))
  const persistedEnv = String(after?.env ?? after?.environment ?? '')
  for (const [key, value] of Object.entries(releaseEnv)) {
    if (!persistedEnv.includes(`${key}=${value}`)) {
      throw new Error(`Dokploy env verification failed for ${key} (release metadata not persisted).`)
    }
  }
  process.stdout.write('Dokploy compose synchronized (release env persisted).\n')
}

/**
 * Trigger a fresh deployment (compose.deploy, not redeploy: deploy runs a NEW deployment that
 * re-pulls images per the just-updated env APP_IMAGE_TAG, whereas redeploy re-runs the previous
 * deployment and would not reliably pick up the new immutable tag), then best-effort poll the
 * deployment status to FAIL FAST on an explicit error. Authoritative success is the public
 * gateway serving the expected release (wait-public) — this poll never false-fails.
 */
async function deploy({ api, resolveComposeId, releaseEnv }) {
  const composeId = await resolveComposeId()
  const triggerAt = Date.now()
  const title = `release ${releaseEnv.APP_VERSION}`
  await api('compose.deploy', {
    body: { composeId, title, description: `${process.env.GITHUB_REPOSITORY ?? 'repository'}@${releaseEnv.APP_COMMIT_SHA}` },
    operation: 'trigger deploy'
  })
  process.stdout.write(`Dokploy deploy triggered (${title}).\n`)
  await watchDeployment({ api, composeId, triggerAt, version: releaseEnv.APP_VERSION })
}

const NEGATIVE_STATUS = /(error|fail|cancel)/i
const POSITIVE_STATUS = /(done|success|complete)/i

function readStatus(deployment) {
  for (const k of ['status', 'deploymentStatus', 'buildStatus', 'state']) {
    if (typeof deployment?.[k] === 'string') return deployment[k]
  }
  return null
}
function readCreatedAt(deployment) {
  for (const k of ['createdAt', 'created', 'date', 'startedAt']) {
    const v = deployment?.[k]
    const t = v ? Date.parse(v) : NaN
    if (Number.isFinite(t)) return t
  }
  return null
}

/** Correlate to OUR deployment: created at/after trigger (60s skew), title match preferred. */
function correlateDeployment(list, triggerAt, version) {
  const arr = Array.isArray(list) ? list : (list?.data ?? list?.result ?? [])
  const recent = (Array.isArray(arr) ? arr : []).filter((d) => {
    const c = readCreatedAt(d)
    return c === null || c >= triggerAt - 60_000
  })
  const byTitle = recent.filter((d) => typeof d?.title === 'string' && version && d.title.includes(version))
  const pool = byTitle.length ? byTitle : recent
  pool.sort((a, b) => (readCreatedAt(b) ?? 0) - (readCreatedAt(a) ?? 0))
  return pool[0] ?? null
}

async function watchDeployment({ api, composeId, triggerAt, version }) {
  const deadline = Date.now() + 10 * 60 * 1000
  while (Date.now() < deadline) {
    let payload
    try {
      payload = await api('deployment.allByCompose', { method: 'GET', query: { composeId }, operation: 'deployment status' })
    } catch (e) {
      // Can't read deployment status (endpoint/schema/permission) — defer to the authoritative
      // public wait rather than false-fail. Diagnostics only, no secrets.
      process.stdout.write(`Deployment status unavailable (${e instanceof DokployApiError ? `${e.status} ${e.code ?? ''}` : 'network'}); deferring to public wait.\n`)
      return
    }
    const mine = correlateDeployment(payload, triggerAt, version)
    const status = mine && readStatus(mine)
    if (status && NEGATIVE_STATUS.test(status)) {
      throw new Error(`Dokploy deployment failed: status="${status}" (compose ${maskId(composeId)}).`)
    }
    if (status && POSITIVE_STATUS.test(status)) {
      process.stdout.write(`Dokploy deployment succeeded (status="${status}").\n`)
      return
    }
    await sleep(15000)
  }
  process.stdout.write('Dokploy deployment still pending after 10 min; deferring to public wait (which enforces its own timeout).\n')
}

async function waitPublic(smokeBaseUrl, expectedVersion) {
  const deadline = Date.now() + 15 * 60 * 1000
  const healthUrl = `${smokeBaseUrl}/health`
  const releaseUrl = `${smokeBaseUrl}/release.json`
  while (Date.now() < deadline) {
    try {
      const health = await fetch(healthUrl, { cache: 'no-store', signal: AbortSignal.timeout(8000) })
      if (health.ok) {
        const release = await fetch(releaseUrl, { cache: 'no-store', signal: AbortSignal.timeout(8000) })
        if (release.ok) {
          const body = await release.json().catch(() => null)
          if (!expectedVersion || body?.version === expectedVersion) {
            process.stdout.write('Public deployment is responding with the expected release.\n')
            return
          }
          process.stdout.write(`Waiting for release ${expectedVersion}; current ${body?.version ?? 'unknown'}.\n`)
        }
      }
    } catch {
      process.stdout.write('Waiting for public gateway...\n')
    }
    await sleep(15000)
  }
  throw new Error('Timed out waiting for public deployment.')
}

function requiredEnv(key) {
  const value = process.env[key]
  if (!value) throw new Error(`${key} is required.`)
  return value
}

// Run the CLI only when invoked directly (so tests can import the pure helpers side-effect-free).
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  await main()
}
