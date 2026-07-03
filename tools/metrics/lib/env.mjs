/**
 * Environment + configuration resolution for the GitHub collector.
 *
 * Design principles (mirroring the rest of the pipeline):
 *   • Never require a token. If none is present, everything degrades to `unavailable`.
 *   • No secrets ever reach the frontend. This module is Node-only, read by collectors.
 *   • Local dev reads an un-committed `.env.metrics.local`; CI passes real env vars.
 *
 * Token resolution order (first non-empty wins):
 *   1. METRICS_GITHUB_TOKEN
 *   2. GITHUB_TOKEN
 *   3. GH_TOKEN
 *   4. (none) → GitHub metrics collect as `unavailable`
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Minimal dotenv parser (no dependency). Supports `KEY=value`, `#` comments, blank lines,
 * optional surrounding quotes and a leading `export`. Values already present in
 * `process.env` are NOT overwritten — real CI/shell env always wins over the local file.
 */
export function loadLocalEnv(repoRoot) {
  const file = join(repoRoot, '.env.metrics.local')
  if (!existsSync(file)) return { loaded: false, file, keys: [] }
  const keys = []
  try {
    for (const rawLine of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue
      const withoutExport = line.startsWith('export ') ? line.slice(7) : line
      const eq = withoutExport.indexOf('=')
      if (eq === -1) continue
      const key = withoutExport.slice(0, eq).trim()
      if (!key) continue
      let value = withoutExport.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      // File is a fallback: never clobber an already-exported variable.
      if (process.env[key] === undefined) process.env[key] = value
      keys.push(key)
    }
  } catch {
    return { loaded: false, file, keys: [] }
  }
  return { loaded: true, file, keys }
}

/** First non-empty env var among `names`, else null. */
function firstEnv(...names) {
  for (const n of names) {
    const v = process.env[n]
    if (typeof v === 'string' && v.trim() !== '') return v.trim()
  }
  return null
}

function toInt(v, fallback) {
  const n = Number.parseInt(v ?? '', 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

/** Never log or return the token itself — only whether one was found and where. */
export function resolveToken() {
  if (firstEnv('METRICS_GITHUB_TOKEN')) return { token: process.env.METRICS_GITHUB_TOKEN.trim(), source: 'METRICS_GITHUB_TOKEN' }
  if (firstEnv('GITHUB_TOKEN')) return { token: process.env.GITHUB_TOKEN.trim(), source: 'GITHUB_TOKEN' }
  if (firstEnv('GH_TOKEN')) return { token: process.env.GH_TOKEN.trim(), source: 'GH_TOKEN' }
  return { token: null, source: null }
}

/**
 * Resolve `owner/repo`. Explicit env wins; otherwise best-effort parse of the git
 * `origin` remote. Returns null when it can't be determined (collector → unavailable).
 */
export function resolveRepository(capture, repoRoot) {
  const explicit = firstEnv('METRICS_GITHUB_REPOSITORY', 'GITHUB_REPOSITORY')
  if (explicit && explicit.includes('/')) return explicit
  const remote = capture ? capture('git remote get-url origin', { cwd: repoRoot }) : ''
  if (remote) {
    // git@github.com:owner/repo.git  |  https://github.com/owner/repo(.git)
    const m = remote.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/i)
    if (m) return `${m[1]}/${m[2]}`
  }
  return null
}

/** All GitHub-collector configuration in one resolved object. */
export function resolveGithubConfig(capture, repoRoot) {
  const local = loadLocalEnv(repoRoot)
  const { token, source: tokenSource } = resolveToken()
  const repository = resolveRepository(capture, repoRoot)
  const workflowsRaw = firstEnv('METRICS_GITHUB_WORKFLOWS')
  return {
    localEnvLoaded: local.loaded,
    token,
    tokenSource,
    repository,
    runLimit: toInt(firstEnv('METRICS_GITHUB_RUN_LIMIT'), 20),
    prLimit: toInt(firstEnv('METRICS_GITHUB_PR_LIMIT'), 20),
    // Optional allow-list of workflow file names to focus on (else: all workflows).
    workflows: workflowsRaw
      ? workflowsRaw.split(',').map((s) => s.trim()).filter(Boolean)
      : [],
    // GHCR seam — declared but not required by this pass. See README.
    ghcr: {
      token: firstEnv('METRICS_GHCR_TOKEN'),
      packages: (firstEnv('METRICS_GHCR_PACKAGES') || '').split(',').map((s) => s.trim()).filter(Boolean)
    },
    apiBase: firstEnv('METRICS_GITHUB_API_URL') || 'https://api.github.com'
  }
}
