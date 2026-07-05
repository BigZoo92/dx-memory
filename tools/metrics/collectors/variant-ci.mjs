/**
 * Variant-level CI collector.
 *
 * Reads the artifact produced by `collect-variant.mjs` (tools/metrics/results/ci/<variant>.json)
 * and maps it into the catalog's `variant.*` metric keys. These are `scope:'variant'`: unlike
 * the repo-level GitHub metrics (which tie across the three variants because they share one
 * monorepo pipeline), THESE are per-variant and are what actually differentiate Flow /
 * Friction / Overfit on build/test/Docker cost.
 *
 * Honesty rules: if no artifact exists, or a step/Docker sub-step failed, the corresponding
 * metric is `unavailable` with the reason — never a faked or misleading number.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ok, unavailable, error } from '../lib/metric.mjs'

/** Every variant-level CI/Docker metric key this collector can emit. */
export const VARIANT_CI_KEYS = [
  'variant.ci.build.duration',
  'variant.ci.typecheck.duration',
  'variant.ci.lint.duration',
  'variant.ci.test.duration',
  'variant.ci.validation.cold',
  'variant.ci.validation.warm',
  'variant.ci.tests.executed',
  'variant.ci.tests.passed',
  'variant.ci.tests.failed',
  'variant.ci.tests.skipped',
  'variant.ci.warnings.count',
  'variant.ci.errors.count',
  'variant.ci.ramPeak.build',
  'variant.ci.ramPeak.tests',
  'variant.ci.artifact.distSize',
  'variant.docker.build.duration',
  'variant.docker.image.size',
  'variant.docker.layers.count',
  'variant.docker.layer.maxSize',
  'variant.docker.startup.duration',
  'variant.docker.healthcheck.status',
  'variant.docker.healthcheck.duration',
  'variant.ci.feedback.duration',
  'variant.ci.feedback.samples'
]

/**
 * Real cached CI feedback (scope:variant, OBSERVATIONAL — not scored).
 *
 * Measures, per variant, the delay from a CI run starting to execute to that variant's PRIMARY
 * quality signal being available, with the variant's real cache strategy in play. Precisely:
 *
 *   per run:  max(quality_job.completed_at) − workflow_run.run_started_at         (Definition B)
 *   metric :  mean over eligible runs
 *
 * Why these choices (all documented for the jury):
 *  • Definition B (run_started_at → quality job completed), NOT job execution alone
 *    (completed−started): B includes any pre-quality-job orchestration, so it reflects the
 *    "time to the quality signal". It excludes only the GitHub QUEUE (created_at → run_started_at),
 *    which is runner-availability noise unrelated to the variant.
 *  • Population = PUSH-to-default-branch runs only. On main every variant runs its FULL scope
 *    (Flow nx run-many 19, Friction 2 apps, Overfit 15 JS + Rust) — so samples are comparable
 *    AND structurally free of the PR `nx affected` no-op problem (a cross-variant PR triggers
 *    flow-ci but affected selects 0 flow projects; such PR runs are NOT counted here).
 *  • Conclusions: success / failure / timed_out are real feedback and counted; cancelled &
 *    skipped are excluded (a `cancel-in-progress` supersede or a skipped job is not a feedback).
 *  • Reruns: one sample per run id (the GitHub runs list + jobs endpoint yield the LATEST attempt),
 *    i.e. the feedback that ultimately validated the change. `runAttempt` is kept for transparency.
 *  • Side jobs (Flow `a11y`, Overfit `warm-cache`) are excluded by the `qualityJobs` allow-list.
 *
 * Interpret alongside the scope/size context (already collected, observational): `nxProjects`,
 * `sourceFiles`, `locTotal`, `variant.ci.tests.executed`. Same categories != same work.
 *
 * Honesty: `unavailable` with a precise reason whenever the real signal does not (yet) exist.
 */
const FEEDBACK_DEFAULT_BRANCH = 'main' // matches nx.json defaultBase
const FEEDBACK_INCLUDED_CONCLUSIONS = new Set(['success', 'failure', 'timed_out'])

export function computeFeedback(variant, githubRaw) {
  const cfg = variant?.ci?.feedback
  const none = (reason) => ({
    'variant.ci.feedback.duration': unavailable(reason),
    'variant.ci.feedback.samples': unavailable(reason)
  })
  if (!cfg?.workflow || !Array.isArray(cfg.qualityJobs) || cfg.qualityJobs.length === 0) {
    return none('No ci.feedback descriptor for this variant in variants.config.json.')
  }
  if (!githubRaw?.runs?.length) {
    return none('No GitHub Actions data (no token, or no workflow runs) — real CI feedback requires a completed run.')
  }
  // Eligible runs: THIS variant's workflow, triggered by push to the default branch (full-scope,
  // no-op-free, comparable). PR runs are excluded on purpose (variable affected scope + no-op).
  const wf = cfg.workflow.toLowerCase()
  const runsById = new Map()
  for (const r of githubRaw.runs) {
    if ((r.workflow || '').toLowerCase() !== wf) continue
    if (r.event !== 'push') continue
    if (r.branch !== FEEDBACK_DEFAULT_BRANCH) continue
    if (!r.runStartedAt) continue
    runsById.set(r.id, r) // keyed by run id → one sample per run (latest attempt)
  }
  if (runsById.size === 0) {
    return none(`No push-to-${FEEDBACK_DEFAULT_BRANCH} run of ${cfg.workflow} found yet — pending a real GitHub Actions run.`)
  }
  const jobRecords = githubRaw.jobs?.records ?? []
  if (jobRecords.length === 0) {
    return none('GitHub jobs were not sampled (API budget/rate limit) — cannot attribute feedback time.')
  }
  const wanted = new Set(cfg.qualityJobs)
  const perRun = []
  for (const [id, run] of runsById) {
    const runStart = new Date(run.runStartedAt).getTime()
    const completes = jobRecords
      .filter((j) => j.runId === id && wanted.has(j.name) && FEEDBACK_INCLUDED_CONCLUSIONS.has(j.conclusion) && j.completedAt)
      .map((j) => new Date(j.completedAt).getTime())
      .filter((t) => Number.isFinite(t))
    if (completes.length === 0) continue
    const dur = Math.max(...completes) - runStart // Definition B
    if (Number.isFinite(dur) && dur >= 0) perRun.push(dur)
  }
  if (perRun.length === 0) {
    return none(
      `No eligible push-to-${FEEDBACK_DEFAULT_BRANCH} ${cfg.workflow} quality job (${cfg.qualityJobs.join('/')}, conclusion success|failure|timed_out) sampled yet.`
    )
  }
  const avg = Math.round(perRun.reduce((a, b) => a + b, 0) / perRun.length)
  return {
    'variant.ci.feedback.duration': ok(avg, {
      workflow: cfg.workflow,
      qualityJobs: cfg.qualityJobs,
      samples: perRun.length,
      population: `push-to-${FEEDBACK_DEFAULT_BRANCH}, latest attempt, conclusions success|failure|timed_out`,
      timing: 'max(quality_job.completed_at) − run.run_started_at (excludes GitHub queue)'
    }),
    'variant.ci.feedback.samples': ok(perRun.length, {})
  }
}

function allUnavailable(reason) {
  return Object.fromEntries(VARIANT_CI_KEYS.map((k) => [k, unavailable(reason)]))
}

/**
 * Public entry: cold artifact metrics (local CI matrix JSON) overlaid with the real cached
 * feedback metric (GitHub Actions). `githubRaw` is the github collector's raw output, or null.
 */
export function collectVariantCi(variant, repoRoot, githubRaw = null) {
  return { ...collectArtifactCi(variant, repoRoot), ...computeFeedback(variant, githubRaw) }
}

function collectArtifactCi(variant, repoRoot) {
  const file = join(repoRoot, 'tools', 'metrics', 'results', 'ci', `${variant.id}.json`)
  if (!existsSync(file)) {
    return allUnavailable(
      `No CI artifact — run \`pnpm metrics:variant --variant ${variant.id}\` (or the CI matrix job) to produce tools/metrics/results/ci/${variant.id}.json.`
    )
  }
  let data
  try {
    data = JSON.parse(readFileSync(file, 'utf8'))
  } catch (e) {
    return Object.fromEntries(VARIANT_CI_KEYS.map((k) => [k, error(`Unreadable CI artifact: ${e?.message ?? e}`)]))
  }

  const at = data.generatedAt ?? null
  const stepDuration = (name) => {
    const s = data.steps?.[name]
    if (!s) return unavailable(`No ${name} step recorded.`)
    if (s.status === 'unavailable') return unavailable(s.reason ?? `${name} not configured.`)
    if (s.status !== 'ok') return unavailable(s.reason ?? `${name} step failed (exit ${s.exitCode ?? '?'}).`)
    return typeof s.durationMs === 'number' ? ok(s.durationMs, { command: s.command, at }) : unavailable(`No duration for ${name}.`)
  }
  const stepRam = (name) => {
    const s = data.steps?.[name]
    return s && s.status === 'ok' && typeof s.ramPeakKb === 'number'
      ? ok(s.ramPeakKb, { at })
      : unavailable(s?.ramPeakKb === null ? 'Peak RAM not captured (no /usr/bin/time on runner).' : `No ${name} RAM sample.`)
  }
  const testCount = (field) => {
    const t = data.steps?.test?.tests
    if (!t) return unavailable('Tests step not run.')
    return typeof t[field] === 'number' ? ok(t[field], { at }) : unavailable(t.note ?? `Could not parse ${field} from test output.`)
  }
  const diag = (field) => {
    const d = data.diagnostics
    return d && typeof d[field] === 'number' ? ok(d[field], { at, method: 'heuristic parse of tool output' }) : unavailable('No diagnostics parsed.')
  }

  // Full-validation totals. Cold = the intrinsic, cache-disabled cost of the whole
  // protocol (build+typecheck+lint+test). Warm = the SAME gates re-run immediately after,
  // with the variant's real cache strategy — the everyday "re-validate my change" cost.
  // Both require all four steps to have succeeded: a partial sum would silently favour
  // the variant whose slowest step failed.
  const STEPS = ['build', 'typecheck', 'lint', 'test']
  const sumSteps = (steps, label) => {
    if (!steps) return unavailable(`No ${label} pass recorded — re-run \`pnpm metrics:variant\` (collector ≥1.2).`)
    const durations = STEPS.map((s) => steps[s])
    const failed = STEPS.filter((s, i) => !durations[i] || durations[i].status !== 'ok' || typeof durations[i].durationMs !== 'number')
    if (failed.length > 0) return unavailable(`Incomplete ${label} pass (missing/failed: ${failed.join(', ')}).`)
    return ok(durations.reduce((acc, s) => acc + s.durationMs, 0), { at, steps: Object.fromEntries(STEPS.map((s, i) => [s, durations[i].durationMs])) })
  }

  const out = {
    'variant.ci.build.duration': stepDuration('build'),
    'variant.ci.typecheck.duration': stepDuration('typecheck'),
    'variant.ci.lint.duration': stepDuration('lint'),
    'variant.ci.test.duration': stepDuration('test'),
    'variant.ci.validation.cold': sumSteps(data.steps, 'cold validation'),
    'variant.ci.validation.warm': sumSteps(data.warmSteps, 'warm re-validation'),
    'variant.ci.tests.executed': testCount('executed'),
    'variant.ci.tests.passed': testCount('passed'),
    'variant.ci.tests.failed': testCount('failed'),
    'variant.ci.tests.skipped': testCount('skipped'),
    'variant.ci.warnings.count': diag('warnings'),
    'variant.ci.errors.count': diag('errors'),
    'variant.ci.ramPeak.build': stepRam('build'),
    'variant.ci.ramPeak.tests': stepRam('test'),
    'variant.ci.artifact.distSize':
      data.artifact?.status === 'ok' && typeof data.artifact.distSizeKb === 'number'
        ? ok(data.artifact.distSizeKb, { at })
        : unavailable(data.artifact?.reason ?? 'No build artifact measured.')
  }

  // ---- Docker (best-effort) --------------------------------------------------
  const d = data.docker ?? {}
  const dockerUnavail = (reason) => unavailable(reason ?? d.reason ?? 'Docker not measured.')
  const bs = d.build
  out['variant.docker.build.duration'] =
    bs?.status === 'ok' && typeof bs.durationMs === 'number' ? ok(bs.durationMs, { at }) : dockerUnavail(bs?.reason)
  const im = d.imageStats
  out['variant.docker.image.size'] =
    im?.status === 'ok' && typeof im.sizeKb === 'number' ? ok(im.sizeKb, { at }) : dockerUnavail(im?.reason)
  out['variant.docker.layers.count'] =
    im?.status === 'ok' && typeof im.layers === 'number' ? ok(im.layers, { at }) : dockerUnavail(im?.reason)
  out['variant.docker.layer.maxSize'] =
    im?.status === 'ok' && typeof im.maxLayerKb === 'number' ? ok(im.maxLayerKb, { at }) : dockerUnavail(im?.reason)
  const rt = d.runtime
  out['variant.docker.startup.duration'] =
    rt?.status === 'ok' && typeof rt.startupMs === 'number' ? ok(rt.startupMs, { at }) : dockerUnavail(rt?.reason)
  const hc = rt?.healthcheck
  out['variant.docker.healthcheck.status'] = hc?.status ? ok(hc.status, { at }) : dockerUnavail(rt?.reason)
  out['variant.docker.healthcheck.duration'] =
    hc?.status === 'ok' && typeof hc.durationMs === 'number' ? ok(hc.durationMs, { at }) : dockerUnavail(rt?.reason)

  return out
}
