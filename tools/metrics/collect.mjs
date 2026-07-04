#!/usr/bin/env node
/**
 * SignalOps dynamic-metrics collector.
 *
 * Runs every collector for every variant, scores them transparently, and writes:
 *   results/latest/<variant>.json   — full self-describing per-variant metrics + scores
 *   results/summary/latest.json     — single file the dashboard consumes (all variants)
 *   results/history/<ts>/…          — immutable snapshot for trend analysis
 *
 * Design principles:
 *   • Never fake a number. Missing data → status "unavailable"/"error" with a reason.
 *   • One failing collector can't take down the run (every collector is guarded).
 *   • Static by default (fast, deterministic). Timings are opt-in with `--timings`.
 *
 * Usage:  node tools/metrics/collect.mjs [--timings] [--no-history]
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildProjectGraph } from './lib/projectgraph.mjs'
import { guard } from './lib/metric.mjs'
import { capture } from './lib/exec.mjs'
import { resolveGithubConfig } from './lib/env.mjs'
import { collectMetadata } from './collectors/metadata.mjs'
import { collectGithub } from './collectors/github.mjs'
import { collectArchitecture } from './collectors/architecture.mjs'
import { collectDependencies } from './collectors/dependencies.mjs'
import { collectGraph } from './collectors/graph.mjs'
import { collectBundle } from './collectors/bundle.mjs'
import { collectBuild } from './collectors/build.mjs'
import { collectVariantCi } from './collectors/variant-ci.mjs'
import { collectLighthouse } from './collectors/lighthouse.mjs'
import { collectNotMeasured } from './collectors/placeholders.mjs'
import { scoreAll } from './score.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..', '..')
const resultsDir = join(here, 'results')

const argv = new Set(process.argv.slice(2))
const withTimings = argv.has('--timings')
const noHistory = argv.has('--no-history')

const variantsCfg = JSON.parse(readFileSync(join(here, 'config', 'variants.config.json'), 'utf8'))
const scoringCfg = JSON.parse(readFileSync(join(here, 'config', 'scoring.config.json'), 'utf8'))
const catalog = scoringCfg.metrics

function nowIso() {
  return new Date().toISOString()
}

function log(msg) {
  process.stdout.write(`${msg}\n`)
}

/** Merge guarded collector outputs; capture any collector-level error under __error. */
function assembleMetrics(...maps) {
  const flat = {}
  const errors = []
  for (const m of maps) {
    if (m && m.__error) {
      errors.push(m.__error.reason)
      continue
    }
    Object.assign(flat, m)
  }
  return { flat, errors }
}

/** Attach catalog metadata (label/unit/direction/…) to each metric entry. */
function enrich(flat) {
  const out = {}
  for (const [key, m] of Object.entries(flat)) {
    const c = catalog[key]
    out[key] = {
      ...m,
      label: c?.label ?? key,
      unit: c?.unit ?? null,
      direction: c?.direction ?? 'neutral',
      category: c?.category ?? 'Other',
      axis: c?.axis ?? null,
      scope: c?.scope ?? 'variant',
      description: c?.description ?? null
    }
  }
  return out
}

function countStatuses(flat) {
  const s = { ok: 0, unavailable: 0, error: 0 }
  for (const m of Object.values(flat)) if (s[m.status] != null) s[m.status]++
  return s
}

async function main() {
  const started = nowIso()
  log(`\n◆ SignalOps metrics — dynamic collection${withTimings ? ' (with timings)' : ''}`)
  log(`  repo: ${repoRoot}`)

  const projects = buildProjectGraph(repoRoot)
  log(`  workspace projects discovered: ${projects.size}`)

  // --- GitHub Actions / delivery pipeline (repo-level, best-effort) ------------
  // Resolves a token from METRICS_GITHUB_TOKEN → GITHUB_TOKEN → GH_TOKEN (else unavailable).
  // Never throws: a missing token, rate limit, or API error degrades to `unavailable`.
  const ghConfig = resolveGithubConfig(capture, repoRoot)
  const variantRoots = Object.fromEntries(variantsCfg.variants.map((v) => [v.id, v.roots]))
  let github
  try {
    github = await collectGithub(ghConfig, { variantRoots, now: started })
  } catch (e) {
    github = {
      source: { status: 'error', repository: ghConfig.repository ?? null, reason: `github collector crashed: ${e?.message ?? e}` },
      metrics: {},
      raw: null
    }
  }
  log(
    `  github: ${github.source.status}` +
      (github.source.status === 'ok'
        ? ` · ${github.raw?.runs?.length ?? 0} runs · ${github.raw?.jobs?.byName?.length ?? 0} jobs`
        : ` (${github.source.reason ?? 'no data'})`)
  )

  const collected = []
  for (const variant of variantsCfg.variants) {
    log(`\n→ ${variant.label} (${variant.id})`)
    const meta = collectMetadata(variant, repoRoot, started)

    const arch = guard('architecture', () =>
      collectArchitecture(variant, repoRoot, {
        fileSizeThreshold: scoringCfg.thresholds.fileSize,
        complexityThreshold: scoringCfg.thresholds.complexity
      })
    )
    const deps = guard('dependencies', () => collectDependencies(variant, projects))
    const graphRes = guard('graph', () => collectGraph(variant, projects))
    const graphMetrics = graphRes.__error ? graphRes : graphRes.metrics
    const bundleRes = guard('bundle', () => collectBundle(variant, repoRoot))
    const bundleMetrics = bundleRes.__error ? bundleRes : bundleRes.metrics
    const build = guard('build', () => collectBuild(variant, repoRoot, { timings: withTimings }))
    // Variant-level CI/Docker metrics (scope:'variant') read from the CI matrix artifact, if present.
    const variantCi = guard('variant-ci', () => collectVariantCi(variant, repoRoot, github.raw))
    const lh = guard('lighthouse', () => collectLighthouse(variant, repoRoot))

    const { flat, errors } = assembleMetrics(arch, deps, graphMetrics, bundleMetrics, build, variantCi, lh)
    const statuses = countStatuses(flat)
    log(`  metrics: ${statuses.ok} ok · ${statuses.unavailable} unavailable · ${statuses.error} error`)
    if (errors.length) log(`  collector errors: ${errors.join('; ')}`)

    collected.push({
      id: variant.id,
      metricsFlat: flat, // raw (for scoring)
      meta,
      graph: graphRes.__error ? { nodes: [], edges: [], central: [], isolated: [] } : graphRes.graph,
      topChunks: bundleRes.__error ? [] : bundleRes.topChunks,
      statuses,
      collectorErrors: errors
    })
  }

  // scoring across variants (repo-level GitHub metrics are shared by all three)
  const { perVariantScores, normScores, winners } = scoreAll(scoringCfg, collected, github.metrics)
  const notMeasured = collectNotMeasured()
  const githubMetrics = enrich(github.metrics)

  // write per-variant files
  mkdirSync(join(resultsDir, 'latest'), { recursive: true })
  const enrichedVariants = collected.map((v) => ({
    meta: v.meta,
    metrics: enrich(v.metricsFlat),
    graph: v.graph,
    topChunks: v.topChunks,
    scores: perVariantScores[v.id],
    statuses: v.statuses,
    collectorErrors: v.collectorErrors,
    notMeasured
  }))
  for (const v of enrichedVariants) {
    writeJson(join('latest', `${v.meta.variant}.json`), v)
  }

  // single summary the dashboard reads
  const summary = {
    generatedAt: started,
    collectorVersion: variantsCfg.collectorVersion,
    source: 'collected',
    withTimings,
    commit: collected[0]?.meta.commit ?? null,
    commitShort: collected[0]?.meta.commitShort ?? null,
    branch: collected[0]?.meta.branch ?? null,
    environment: collected[0]?.meta.environment ?? null,
    axisWeights: scoringCfg.axisWeights,
    scoreGroups: scoringCfg.scoreGroups,
    catalog,
    thresholds: scoringCfg.thresholds,
    variants: enrichedVariants.map((v) => ({
      meta: v.meta,
      metrics: v.metrics,
      graph: v.graph,
      topChunks: v.topChunks,
      scores: v.scores,
      statuses: v.statuses
    })),
    normScores,
    winners,
    notMeasured,
    // --- GitHub delivery pipeline ------------------------------------------
    sources: { github: github.source },
    githubMetrics, // enriched, repo-level (fed to Ship/Change scoring; tie across variants)
    github: github.raw, // raw data for the dashboard's Actions / PR / deploy visualizations
    history: buildHistory(resultsDir, started, collected, perVariantScores, github)
  }
  mkdirSync(join(resultsDir, 'summary'), { recursive: true })
  writeJson(join('summary', 'latest.json'), summary)

  // history snapshot (immutable). Drop the reconstructed `history` array to keep snapshots
  // lean (it is derived from the snapshots themselves — storing it would grow quadratically).
  if (!noHistory) {
    const stamp = `${started.replace(/[:.]/g, '-')}_${collected[0]?.meta.commitShort ?? 'nogit'}`
    const histDir = join('history', stamp)
    mkdirSync(join(resultsDir, histDir), { recursive: true })
    writeJson(join(histDir, 'summary.json'), { ...summary, history: undefined })
  }

  // headline
  const ranking = collected
    .map((v) => ({ id: v.id, score: perVariantScores[v.id].totalDeliveryScore.value }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  log(`\n◆ Total Delivery Score ranking:`)
  ranking.forEach((r, i) => log(`  ${i + 1}. ${r.id.padEnd(9)} ${r.score}`))
  log(`\n✓ Written to tools/metrics/results/{latest,summary,history}\n`)
}

function writeJson(rel, data) {
  const full = join(resultsDir, rel)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
  log(`  ✓ ${rel}`)
}

/**
 * Reconstruct a compact trend series from the immutable history snapshots plus the current
 * run. Only tiny, stable fields are pulled so it works across snapshot format versions:
 * headline + ship scores per variant, CI wall time and Flow's gzip bundle. Missing fields
 * degrade to null — the dashboard renders whatever exists.
 */
function buildHistory(resultsDir, started, collected, perVariantScores, github) {
  const point = (generatedAt, commitShort, sum) => {
    const variantScore = (id, group) => {
      if (sum) {
        const v = sum.variants?.find((x) => x.meta?.variant === id)
        return v?.scores?.[group]?.value ?? null
      }
      return perVariantScores[id]?.[group]?.value ?? null
    }
    const ciWall = sum
      ? sum.githubMetrics?.['ship.ci.wallTime.avg']?.value ?? null
      : github.metrics?.['ship.ci.wallTime.avg']?.value ?? null
    const flowBundle = sum
      ? sum.variants?.find((v) => v.meta?.variant === 'flow')?.metrics?.bundleJsGzipKb?.value ?? null
      : collected.find((c) => c.id === 'flow')?.metricsFlat?.bundleJsGzipKb?.value ?? null
    return {
      at: generatedAt,
      commit: commitShort ?? null,
      totalDeliveryScore: {
        flow: variantScore('flow', 'totalDeliveryScore'),
        friction: variantScore('friction', 'totalDeliveryScore'),
        overfit: variantScore('overfit', 'totalDeliveryScore')
      },
      shipScore: {
        flow: variantScore('flow', 'ship'),
        friction: variantScore('friction', 'ship'),
        overfit: variantScore('overfit', 'ship')
      },
      ciWallTimeMs: typeof ciWall === 'number' ? ciWall : null,
      flowBundleGzipKb: typeof flowBundle === 'number' ? flowBundle : null
    }
  }

  const points = []
  const histRoot = join(resultsDir, 'history')
  if (existsSync(histRoot)) {
    for (const dir of readdirSync(histRoot)) {
      const file = join(histRoot, dir, 'summary.json')
      if (!existsSync(file)) continue
      try {
        const sum = JSON.parse(readFileSync(file, 'utf8'))
        points.push(point(sum.generatedAt ?? dir, sum.commitShort, sum))
      } catch {
        /* skip unreadable snapshot */
      }
    }
  }
  // Add the run currently being written (not yet on disk).
  points.push(point(started, collected[0]?.meta.commitShort))
  points.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
  // De-dupe by timestamp (a re-run at the same instant) and cap to a sane window.
  const seen = new Set()
  const deduped = points.filter((p) => (seen.has(p.at) ? false : seen.add(p.at)))
  return deduped.slice(-50)
}

await main()
