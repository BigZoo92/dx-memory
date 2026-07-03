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
  'variant.docker.healthcheck.duration'
]

function allUnavailable(reason) {
  return Object.fromEntries(VARIANT_CI_KEYS.map((k) => [k, unavailable(reason)]))
}

export function collectVariantCi(variant, repoRoot) {
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

  const out = {
    'variant.ci.build.duration': stepDuration('build'),
    'variant.ci.typecheck.duration': stepDuration('typecheck'),
    'variant.ci.lint.duration': stepDuration('lint'),
    'variant.ci.test.duration': stepDuration('test'),
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
