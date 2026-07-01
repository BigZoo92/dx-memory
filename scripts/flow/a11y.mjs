// pnpm flow:a11y — accessibility audit of the Flow routes with Pa11y CI (HTML_CodeSniffer + axe,
// real Chromium so it also catches contrast) and Lighthouse CI.
//
// Reliability contract (why this script exists in this shape):
//   - If FLOW_A11Y_BASE_URL is set, audit that URL and never touch a server.
//   - Otherwise, reuse an app already listening on the port, or build + start one ourselves.
//   - Always wait for GET /api/health before auditing (no ERR_CONNECTION_REFUSED races).
//   - Run Pa11y at concurrency 1 against the single production server (no Target.closeTarget churn).
//   - Real accessibility violations make the script exit 1. Only genuine tooling-absence skips.
//   - Server logs are surfaced when the healthcheck fails, and the server is always killed.
//
// Outputs (docs/audit/flow/): pa11y-results.json, a11y-debug.log, accessibility-report.md.
import { spawn, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { writeFileSync, mkdirSync } from 'node:fs'
import { section, ok, warn, fail, info, run } from './lib/sh.mjs'

const PORT = process.env.FLOW_A11Y_PORT || '3000'
const EXTERNAL = process.env.FLOW_A11Y_BASE_URL?.replace(/\/$/, '')
const BASE = EXTERNAL || `http://localhost:${PORT}`
const HEALTH_TIMEOUT_MS = Number(process.env.FLOW_A11Y_HEALTH_TIMEOUT_MS || 60_000)
const AUDIT_DIR = 'docs/audit/flow'
const PA11Y_CONFIG = '.pa11yci.runtime.json'
const LH_CONFIG = '.lighthouserc.runtime.json'

// `:id` is resolved to a real signal id at runtime so the detail route is actually audited.
const ROUTES = [
  '/',
  '/signals',
  '/signals/:id',
  '/incidents',
  '/compare',
  '/dx-metrics',
  '/settings',
  '/ops'
]

const require = createRequire(import.meta.url)
const resolvable = (pkg) => {
  try {
    require.resolve(pkg)
    return true
  } catch {
    return false
  }
}
// Resolve via package.json — @lhci/cli exposes no root main export.
const hasPa11y = resolvable('pa11y-ci/package.json')
const hasLhci = resolvable('@lhci/cli/package.json')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function isHealthy() {
  try {
    const res = await fetch(`${BASE}/api/health`)
    return res.ok
  } catch {
    return false
  }
}

async function waitForHealth(timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await isHealthy()) return true
    await sleep(500)
  }
  return false
}

async function resolveSignalId() {
  try {
    const res = await fetch(`${BASE}/api/signals?page=1&pageSize=1`)
    const body = await res.json()
    return body?.items?.[0]?.id ?? body?.data?.[0]?.id ?? null
  } catch {
    return null
  }
}

section('Flow accessibility audit')

if (!hasPa11y && !hasLhci) {
  warn('pa11y-ci and @lhci/cli are not installed (dev/CI-only).')
  info('Install them with:  pnpm add -Dw pa11y-ci @lhci/cli')
  info('Routes that would be audited:')
  for (const route of ROUTES) info(`  ${route}`)
  ok('a11y audit skipped (tooling absent) — not a failure')
  process.exit(0)
}

mkdirSync(AUDIT_DIR, { recursive: true })

let server = null
const serverLog = []

function stopServer() {
  if (!server) return
  server.kill('SIGTERM')
  const pid = server.pid
  server = null
  // Escalate if it does not exit promptly.
  setTimeout(() => {
    try {
      process.kill(pid, 'SIGKILL')
    } catch {
      // already gone
    }
  }, 3000).unref?.()
}

async function ensureServer() {
  if (EXTERNAL) {
    info(`Using external app at ${BASE} (FLOW_A11Y_BASE_URL) — not starting a server.`)
    if (!(await waitForHealth(HEALTH_TIMEOUT_MS))) {
      fail(`external app at ${BASE} never returned a healthy GET /api/health`)
      process.exit(1)
    }
    return
  }

  if (await isHealthy()) {
    info(`Reusing the app already listening on ${BASE}.`)
    return
  }

  info('Building the app (pnpm build:flow)...')
  run('pnpm build:flow')

  info(`Starting the production server on :${PORT}...`)
  server = spawn('node', ['server.mjs'], {
    cwd: 'apps/flow-app',
    env: { ...process.env, PORT }
  })
  server.stdout.on('data', (d) => serverLog.push(d.toString()))
  server.stderr.on('data', (d) => serverLog.push(d.toString()))
  server.on('exit', (code) => {
    if (code && code !== 0) serverLog.push(`\n[server exited with code ${code}]\n`)
  })

  if (!(await waitForHealth(HEALTH_TIMEOUT_MS))) {
    fail(`server did not become healthy within ${HEALTH_TIMEOUT_MS / 1000}s`)
    info('--- server output ---')
    process.stdout.write(serverLog.join('') || '(no output captured)\n')
    stopServer()
    process.exit(1)
  }
}

function writePa11yConfig(urls) {
  // Both runners so we catch what each misses (htmlcs = contrast/structure, axe = ARIA/roles).
  // concurrency 1 keeps the single production server stable (no Target.closeTarget churn).
  const config = {
    defaults: {
      standard: 'WCAG2AA',
      runners: ['htmlcs', 'axe'],
      timeout: 60000,
      wait: 500,
      concurrency: 1,
      chromeLaunchConfig: { args: ['--no-sandbox', '--disable-dev-shm-usage'] }
    },
    urls
  }
  writeFileSync(PA11Y_CONFIG, JSON.stringify(config, null, 2))
}

function writeLighthouseConfig(urls) {
  const config = {
    ci: {
      collect: { url: urls, numberOfRuns: 1 },
      assert: {
        assertions: {
          'categories:accessibility': ['error', { minScore: 0.9 }],
          'categories:performance': ['warn', { minScore: 0.8 }],
          'categories:best-practices': ['warn', { minScore: 0.9 }]
        }
      },
      upload: { target: 'filesystem', outputDir: '.lighthouseci' }
    }
  }
  writeFileSync(LH_CONFIG, JSON.stringify(config, null, 2))
}

function runPa11y() {
  info('Running Pa11y CI (htmlcs + axe)...')
  const res = spawnSync('pnpm', ['exec', 'pa11y-ci', '--config', PA11Y_CONFIG, '--json'], {
    encoding: 'utf8',
    maxBuffer: 1 << 28
  })
  const stdout = res.stdout || ''
  const start = stdout.indexOf('{')
  if (start === -1) {
    fail('Pa11y CI produced no parseable JSON output.')
    process.stdout.write(stdout)
    process.stderr.write(res.stderr || '')
    return { errors: 1, total: 0, passes: 0, results: {} }
  }
  const json = JSON.parse(stdout.slice(start))
  writeFileSync(`${AUDIT_DIR}/pa11y-results.json`, JSON.stringify(json, null, 2))
  return json
}

function reportPa11y(json) {
  const lines = []
  const push = (s = '') => lines.push(s)
  push(`Flow accessibility audit — Pa11y CI (WCAG2AA, htmlcs + axe)`)
  push(`Base URL: ${BASE}`)
  push(`URLs: ${json.total}   Passed: ${json.passes}   With errors: ${json.errors}`)
  push('')
  for (const [url, issues] of Object.entries(json.results || {})) {
    const errors = (issues || []).filter((i) => i.type === 'error')
    push(`${errors.length === 0 ? 'PASS' : 'FAIL'}  ${url}  (${errors.length} errors)`)
    for (const issue of errors) {
      push(`   - ${issue.code}`)
      push(`     ${issue.message}`)
      if (issue.selector) push(`     selector: ${issue.selector}`)
      if (issue.context) push(`     context : ${issue.context.replace(/\s+/g, ' ').trim()}`)
    }
  }
  const text = lines.join('\n') + '\n'
  writeFileSync(`${AUDIT_DIR}/a11y-debug.log`, text)
  return text
}

function writeReport(json) {
  const lines = []
  lines.push('# Flow accessibility report')
  lines.push('')
  lines.push('Generated by `pnpm flow:a11y` (Pa11y CI, WCAG 2.1 AA, runners: HTML_CodeSniffer + axe-core).')
  lines.push('')
  lines.push(`- Base URL: \`${BASE}\``)
  lines.push(`- URLs audited: ${json.total}`)
  lines.push(`- URLs with errors: ${json.errors}`)
  lines.push('')
  lines.push('| Route | Errors | Warnings | Status |')
  lines.push('| --- | ---: | ---: | --- |')
  for (const [url, issues] of Object.entries(json.results || {})) {
    const path = url.replace(BASE, '') || '/'
    const errors = (issues || []).filter((i) => i.type === 'error').length
    const warnings = (issues || []).filter((i) => i.type === 'warning').length
    lines.push(`| \`${path}\` | ${errors} | ${warnings} | ${errors === 0 ? 'PASS' : 'FAIL'} |`)
  }
  lines.push('')
  if (json.errors === 0) {
    lines.push('No accessibility errors. No Pa11y rules are ignored and no false positives are')
    lines.push('suppressed; every route passes both runners on its own merits.')
  } else {
    lines.push('Errors above are real WCAG AA violations and must be fixed in the source, not ignored.')
  }
  lines.push('')
  writeFileSync(`${AUDIT_DIR}/accessibility-report.md`, lines.join('\n'))
}

function runLighthouse(urls) {
  if (!hasLhci) return
  info('Running Lighthouse CI (same URLs)...')
  writeLighthouseConfig(urls)
  const res = spawnSync('pnpm', ['exec', 'lhci', 'autorun', `--config=${LH_CONFIG}`], {
    stdio: 'inherit'
  })
  if (res.status !== 0) warn('Lighthouse CI reported issues (non-blocking for now).')
}

async function main() {
  await ensureServer()
  try {
    const signalId = await resolveSignalId()
    if (!signalId) warn('could not resolve a real signal id — falling back to sig_0001 for /signals/:id')
    const urls = ROUTES.map((route) =>
      route.includes(':id') ? `${BASE}${route.replace(':id', signalId ?? 'sig_0001')}` : `${BASE}${route}`
    )

    writePa11yConfig(urls)
    const json = runPa11y()
    const readable = reportPa11y(json)
    writeReport(json)
    process.stdout.write(readable)

    if (json.errors > 0) {
      fail(`Pa11y CI found accessibility violations on ${json.errors} route(s) — see ${AUDIT_DIR}/a11y-debug.log`)
      process.exitCode = 1
    } else {
      ok(`accessibility audit passed — ${json.total} routes, 0 violations`)
    }

    runLighthouse(urls)
  } finally {
    stopServer()
  }
}

main().catch((error) => {
  fail(`a11y audit failed: ${error instanceof Error ? error.stack || error.message : String(error)}`)
  stopServer()
  process.exit(1)
})
