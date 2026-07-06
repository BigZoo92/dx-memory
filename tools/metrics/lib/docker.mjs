/**
 * Docker helpers for the variant-level CI runner. STRICTLY best-effort: every function is
 * guarded and returns a { ok, ... , reason } shape rather than throwing, so a missing Docker
 * daemon, an app with no Dockerfile, or a failed build never takes down the rest of the run.
 *
 * Nothing here fakes a number: if Docker can't produce a real value the caller records the
 * metric as `unavailable` with the reason surfaced here.
 */
import { existsSync } from 'node:fs'
import { get as httpGet } from 'node:http'
import { timeCommand, capture } from './exec.mjs'

/** Is a working Docker CLI + daemon reachable? */
export function dockerAvailable(cwd) {
  const version = capture('docker version --format "{{.Server.Version}}"', { cwd, timeoutMs: 10000 })
  return { ok: Boolean(version), version: version || null }
}

/**
 * `docker build` (timed). Returns { ok, durationMs, code, reason }.
 * Uses --progress=plain and no cache so the number is a clean cold-build measurement.
 */
export function dockerBuild({ dockerfile, context = '.', image, cwd, timeoutMs = 20 * 60 * 1000 }) {
  if (!dockerfile || !existsSync(`${cwd}/${dockerfile}`)) {
    return { ok: false, durationMs: null, reason: `No Dockerfile at ${dockerfile ?? '(unset)'}.` }
  }
  const cmd = `docker build --progress=plain --no-cache -f ${dockerfile} -t ${image} ${context}`
  const res = timeCommand(cmd, { cwd, timeoutMs })
  return res.ok
    ? { ok: true, durationMs: res.ms, code: res.code }
    : { ok: false, durationMs: res.ms, code: res.code, reason: `\`docker build\` exited ${res.code}${res.error ? ` (${res.error})` : ''}`, stderrTail: tail(res.stderr) }
}

/**
 * Image size + layer stats via `docker image inspect` and `docker history`.
 * Returns { ok, sizeKb, layers, maxLayerKb, reason }.
 */
export function dockerImageStats({ image, cwd }) {
  const sizeBytes = Number.parseInt(capture(`docker image inspect ${image} --format "{{.Size}}"`, { cwd }), 10)
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return { ok: false, sizeKb: null, layers: null, maxLayerKb: null, reason: `Could not inspect image ${image}.` }
  }
  // RootFS layer count is authoritative (deduplicated content layers).
  const layerCount = Number.parseInt(capture(`docker image inspect ${image} --format "{{len .RootFS.Layers}}"`, { cwd }), 10)
  // `docker history` gives per-build-step sizes (human readable) — used only for the largest layer.
  const history = capture(`docker history --no-trunc --format "{{.Size}}" ${image}`, { cwd })
  const layerBytes = history
    .split(/\r?\n/)
    .map((s) => parseHumanBytes(s))
    .filter((n) => Number.isFinite(n) && n > 0)
  const maxLayerBytes = layerBytes.length ? Math.max(...layerBytes) : null
  return {
    ok: true,
    sizeKb: round1(sizeBytes / 1024),
    layers: Number.isFinite(layerCount) && layerCount > 0 ? layerCount : layerBytes.length || null,
    maxLayerKb: maxLayerBytes != null ? round1(maxLayerBytes / 1024) : null
  }
}

/**
 * Start the image, poll its health endpoint, measure time-to-healthy + one request latency,
 * then always tear the container down. Returns { ok, startupMs, healthcheck, reason }.
 */
export async function dockerRunAndProbe({ image, port, hostPort, healthPath = '/', cwd, timeoutMs = 60000 }) {
  const publish = `${hostPort}:${port}`
  const cid = capture(`docker run -d --rm -p ${publish} ${image}`, { cwd, timeoutMs: 30000 })
  if (!cid) return { ok: false, startupMs: null, healthcheck: { status: 'fail', durationMs: null }, reason: `Could not start container from ${image}.` }
  const url = `http://127.0.0.1:${hostPort}${healthPath}`
  const startedAt = process.hrtime.bigint()
  const deadline = Date.now() + timeoutMs
  let startupMs = null
  let requestMs = null
  try {
    while (Date.now() < deadline) {
      const t0 = process.hrtime.bigint()
      const okResp = await probe(url)
      const dt = Number((process.hrtime.bigint() - t0) / 1000000n)
      if (okResp) {
        startupMs = Number((process.hrtime.bigint() - startedAt) / 1000000n)
        requestMs = dt
        break
      }
      await sleep(500)
    }
  } finally {
    // Best-effort teardown (--rm removes it once stopped).
    capture(`docker stop ${cid}`, { cwd, timeoutMs: 20000 })
  }
  if (startupMs == null) {
    return { ok: false, startupMs: null, healthcheck: { status: 'fail', durationMs: null }, reason: `Container never became healthy at ${healthPath} within ${Math.round(timeoutMs / 1000)}s.` }
  }
  return { ok: true, startupMs, healthcheck: { status: 'ok', durationMs: requestMs } }
}

/* ------------------------------------------------------------------- helpers */
async function probe(url) {
  return new Promise((resolve) => {
    let settled = false
    const finish = (ok) => {
      if (settled) return
      settled = true
      resolve(ok)
    }
    const req = httpGet(url, (res) => {
      res.resume()
      finish(res.statusCode >= 200 && res.statusCode < 500) // any served response = process is up
    })
    req.setTimeout(4000, () => {
      req.destroy()
      finish(false)
    })
    req.on('error', () => finish(false))
  })
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}
function parseHumanBytes(s) {
  const m = String(s).trim().match(/^([\d.]+)\s*([kKmMgGtT]?)i?B$/)
  if (!m) return NaN
  const n = Number.parseFloat(m[1])
  const unit = m[2].toLowerCase()
  const mult = unit === 'k' ? 1024 : unit === 'm' ? 1024 ** 2 : unit === 'g' ? 1024 ** 3 : unit === 't' ? 1024 ** 4 : 1
  return n * mult
}
function round1(n) {
  return Math.round(n * 10) / 10
}
function tail(s, n = 600) {
  const str = String(s ?? '')
  return str.length > n ? str.slice(-n) : str
}
