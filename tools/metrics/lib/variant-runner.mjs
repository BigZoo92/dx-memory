/**
 * Variant-level CI runner.
 *
 * Runs one variant's real build / typecheck / lint / test commands (from
 * variants.config.json → `ci.commands`), measures wall-clock duration and peak RAM for each,
 * parses test counts and warning/error counts from the tool output, sizes the build artifact,
 * and (best-effort) builds + probes the variant's Docker image.
 *
 * The output is a single self-describing JSON object per variant (see collect-variant.mjs),
 * consumed back by collectors/variant-ci.mjs as `scope:'variant'` metrics — the numbers that
 * actually differentiate Flow / Friction / Overfit.
 *
 * Honesty rules (identical to the rest of the pipeline):
 *   • Never fake a number — a step that fails records status:'failed' and its metric degrades
 *     to `unavailable` downstream, it does NOT contribute a misleading duration.
 *   • Best-effort — one failing step (or Docker being absent) never aborts the others.
 *   • Non-fatal — the runner always exits 0; the *gating* CI is the per-variant *-ci.yml
 *     workflows, not this measurement pass.
 */
import { existsSync, statSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { platform } from 'node:os'
import { timeCommand } from './exec.mjs'
import { dockerAvailable, dockerBuild, dockerImageStats, dockerRunAndProbe } from './docker.mjs'

const STEP_ORDER = ['build', 'typecheck', 'lint', 'test']

/* ---------------------------------------------------------------- RAM wrapper */
// GNU/BSD `/usr/bin/time` reports peak RSS. We pass the real command via an env var so we
// never have to escape it into the wrapper string.
const TIME_BIN = '/usr/bin/time'
function ramWrapper() {
  if (!existsSync(TIME_BIN)) return null
  const isDarwin = platform() === 'darwin'
  return {
    command: `${TIME_BIN} ${isDarwin ? '-l' : '-v'} bash -c "$__METRICS_CMD"`,
    parse(stderr) {
      if (isDarwin) {
        const m = String(stderr).match(/(\d+)\s+maximum resident set size/)
        return m ? Math.round(Number(m[1]) / 1024) : null // bytes → KB
      }
      const m = String(stderr).match(/Maximum resident set size \(kbytes\):\s*(\d+)/)
      return m ? Number(m[1]) : null // already KB
    }
  }
}

/**
 * Return the RAM wrapper ONLY if it can run a trivial command cleanly. `/usr/bin/time` can
 * itself fail (e.g. BSD `time -l` reads a sysctl that a sandbox blocks) and would otherwise
 * flip a perfectly healthy build to "failed". Probing once guarantees the wrapper never
 * corrupts a step's real exit status — worst case we lose peak-RAM (reported `unavailable`).
 */
function resolveRamWrapper(repoRoot) {
  const w = ramWrapper()
  if (!w) return null
  const probe = timeCommand(w.command, { cwd: repoRoot, env: { __METRICS_CMD: 'true' }, timeoutMs: 15000 })
  return probe.ok && w.parse(probe.stderr) != null ? w : null
}

/* -------------------------------------------------------------- step runner */
function runStep(cmd, repoRoot, wrapper) {
  const res = wrapper
    ? timeCommand(wrapper.command, { cwd: repoRoot, env: { __METRICS_CMD: cmd } })
    : timeCommand(cmd, { cwd: repoRoot })
  const ramPeakKb = wrapper ? wrapper.parse(res.stderr) : null
  return {
    command: cmd,
    status: res.ok ? 'ok' : 'failed',
    exitCode: res.code,
    durationMs: res.ms,
    ramPeakKb,
    stdout: res.stdout ?? '',
    stderr: res.stderr ?? ''
  }
}

/* ------------------------------------------------------------- output parsers */
/** Parse vitest / cargo test summaries into { executed, passed, failed, skipped }. Null if unrecognised. */
export function parseTestCounts(output, runner = 'vitest') {
  const text = String(output)
  if (runner === 'cargo') return parseCargo(text)
  return parseVitest(text) ?? parseCargo(text)
}

function parseVitest(text) {
  // Last "Tests   1 failed | 25 passed | 1 skipped (27)" line wins (final summary).
  const lines = text.split(/\r?\n/).filter((l) => /\bTests\b/.test(l) && /\(\d+\)/.test(l))
  const line = lines[lines.length - 1]
  if (!line) return null
  const num = (re) => {
    const m = line.match(re)
    return m ? Number(m[1]) : 0
  }
  const passed = num(/(\d+)\s+passed/)
  const failed = num(/(\d+)\s+failed/)
  const skipped = num(/(\d+)\s+skipped/)
  const totalM = line.match(/\((\d+)\)/)
  const executed = totalM ? Number(totalM[1]) : passed + failed + skipped
  return { executed, passed, failed, skipped }
}

function parseCargo(text) {
  // Sum across possibly multiple "test result: ok. 12 passed; 0 failed; 0 ignored;" lines.
  const re = /test result:\s+\w+\.\s+(\d+)\s+passed;\s+(\d+)\s+failed;\s+(\d+)\s+ignored/g
  let passed = 0
  let failed = 0
  let ignored = 0
  let matched = false
  let m
  while ((m = re.exec(text))) {
    matched = true
    passed += Number(m[1])
    failed += Number(m[2])
    ignored += Number(m[3])
  }
  if (!matched) return null
  return { executed: passed + failed + ignored, passed, failed, skipped: ignored }
}

/**
 * Heuristic warning/error counters across all step output. Recognises the summary lines of
 * the toolchains actually in use (tsc, eslint, oxlint, next lint, cargo). Deliberately
 * conservative — documented as a heuristic, not an exact compiler-diagnostic count.
 */
export function parseDiagnostics(text) {
  const s = String(text)
  let warnings = 0
  let errors = 0
  // eslint / next lint: "✖ 5 problems (2 errors, 3 warnings)"
  for (const m of s.matchAll(/\((\d+)\s+errors?,\s+(\d+)\s+warnings?\)/g)) {
    errors += Number(m[1])
    warnings += Number(m[2])
  }
  // oxlint: "Found 3 warnings and 1 error."
  for (const m of s.matchAll(/Found\s+(\d+)\s+warnings?\s+and\s+(\d+)\s+errors?/gi)) {
    warnings += Number(m[1])
    errors += Number(m[2])
  }
  // tsc: "Found 4 errors in 2 files." (no warning form)
  for (const m of s.matchAll(/Found\s+(\d+)\s+errors?\s+in/gi)) {
    errors += Number(m[1])
  }
  // cargo: "warning: ..." per-line (bounded by counting distinct lines)
  warnings += (s.match(/^warning:/gm) || []).length
  errors += (s.match(/^error(\[[^\]]+\])?:/gm) || []).length
  return { warnings, errors }
}

/* --------------------------------------------------------------- artifact size */
function dirSizeBytes(dir) {
  let total = 0
  const stack = [dir]
  while (stack.length) {
    const cur = stack.pop()
    let entries
    try {
      entries = readdirSync(cur, { withFileTypes: true })
    } catch {
      continue
    }
    for (const e of entries) {
      const p = join(cur, e.name)
      if (e.isDirectory()) stack.push(p)
      else {
        try {
          total += statSync(p).size
        } catch {
          /* ignore unreadable */
        }
      }
    }
  }
  return total
}

/* --------------------------------------------------------------------- runner */
/**
 * @param {object} variant   entry from variants.config.json
 * @param {string} repoRoot
 * @param {object} opts       { steps?: string[], docker?: boolean, hostPort?: number, now: isoString }
 */
export async function runVariant(variant, repoRoot, { steps, docker = true, hostPort, now } = {}) {
  const ci = variant.ci ?? {}
  const commands = ci.commands ?? {}
  const wanted = (steps && steps.length ? steps : STEP_ORDER).filter((s) => STEP_ORDER.includes(s))

  // Resolve the peak-RAM wrapper once (probed for viability) so it can never corrupt a step.
  const wrapper = resolveRamWrapper(repoRoot)

  const stepResults = {}
  let allOut = ''
  for (const step of STEP_ORDER) {
    if (!wanted.includes(step)) continue
    const cmd = commands[step]
    if (!cmd) {
      stepResults[step] = { status: 'unavailable', reason: `No ${step} command configured for ${variant.id}.` }
      continue
    }
    const r = runStep(cmd, repoRoot, wrapper)
    allOut += `\n${r.stdout}\n${r.stderr}`
    const entry = { command: r.command, status: r.status, exitCode: r.exitCode, durationMs: r.durationMs, ramPeakKb: r.ramPeakKb }
    if (step === 'test') {
      const counts = parseTestCounts(`${r.stdout}\n${r.stderr}`, ci.testRunner)
      entry.tests = counts ?? { executed: null, passed: null, failed: null, skipped: null, note: 'Could not parse test summary from output.' }
    }
    if (r.status !== 'ok') entry.reason = `\`${cmd}\` exited ${r.exitCode}.`
    stepResults[step] = entry
  }

  const diagnostics = parseDiagnostics(allOut)

  // Build artifact size (only meaningful if a build ran or dist already exists).
  const distAbs = join(repoRoot, variant.dist)
  const artifact = existsSync(distAbs)
    ? { status: 'ok', distSizeKb: Math.round((dirSizeBytes(distAbs) / 1024) * 10) / 10, dist: variant.dist }
    : { status: 'unavailable', reason: `No build output at ${variant.dist}.`, distSizeKb: null }

  const dockerResult = docker ? await runDocker(variant, repoRoot, hostPort) : { status: 'skipped', reason: 'Docker disabled via --no-docker.' }

  return {
    variant: variant.id,
    label: variant.label,
    generatedAt: now,
    runner: {
      node: process.version,
      os: platform(),
      ramWrapper: wrapper ? TIME_BIN : null,
      steps: wanted
    },
    steps: stepResults,
    diagnostics,
    artifact,
    docker: dockerResult
  }
}

async function runDocker(variant, repoRoot, hostPort) {
  const cfg = variant.ci?.docker
  if (!cfg?.enabled) return { status: 'unavailable', reason: 'Docker not enabled for this variant.' }
  const avail = dockerAvailable(repoRoot)
  if (!avail.ok) return { status: 'unavailable', reason: 'Docker CLI/daemon not available in this environment.' }

  const out = { status: 'ok', engine: avail.version, image: cfg.image, dockerfile: cfg.dockerfile }
  const build = dockerBuild({ dockerfile: cfg.dockerfile, context: cfg.context ?? '.', image: cfg.image, cwd: repoRoot })
  out.build = build.ok ? { status: 'ok', durationMs: build.durationMs } : { status: 'failed', durationMs: build.durationMs ?? null, reason: build.reason }
  if (!build.ok) {
    // Nothing to inspect/run if the build failed, but keep the shape.
    out.status = 'partial'
    out.imageStats = { status: 'unavailable', reason: 'Image not built.' }
    out.runtime = { status: 'unavailable', reason: 'Image not built.' }
    return out
  }

  const stats = dockerImageStats({ image: cfg.image, cwd: repoRoot })
  out.imageStats = stats.ok
    ? { status: 'ok', sizeKb: stats.sizeKb, layers: stats.layers, maxLayerKb: stats.maxLayerKb }
    : { status: 'unavailable', reason: stats.reason }

  const probe = await dockerRunAndProbe({
    image: cfg.image,
    port: cfg.port,
    hostPort: hostPort ?? cfg.port,
    healthPath: cfg.healthPath ?? '/',
    cwd: repoRoot
  })
  out.runtime = probe.ok
    ? { status: 'ok', startupMs: probe.startupMs, healthcheck: probe.healthcheck }
    : { status: 'unavailable', reason: probe.reason, healthcheck: probe.healthcheck }
  return out
}
