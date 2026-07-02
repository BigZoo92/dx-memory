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
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildProjectGraph } from './lib/projectgraph.mjs'
import { guard } from './lib/metric.mjs'
import { collectMetadata } from './collectors/metadata.mjs'
import { collectArchitecture } from './collectors/architecture.mjs'
import { collectDependencies } from './collectors/dependencies.mjs'
import { collectGraph } from './collectors/graph.mjs'
import { collectBundle } from './collectors/bundle.mjs'
import { collectBuild } from './collectors/build.mjs'
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

function main() {
  const started = nowIso()
  log(`\n◆ SignalOps metrics — dynamic collection${withTimings ? ' (with timings)' : ''}`)
  log(`  repo: ${repoRoot}`)

  const projects = buildProjectGraph(repoRoot)
  log(`  workspace projects discovered: ${projects.size}`)

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
    const lh = guard('lighthouse', () => collectLighthouse(variant, repoRoot))

    const { flat, errors } = assembleMetrics(arch, deps, graphMetrics, bundleMetrics, build, lh)
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

  // scoring across variants
  const { perVariantScores, normScores, winners } = scoreAll(scoringCfg, collected)
  const notMeasured = collectNotMeasured()

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
    notMeasured
  }
  mkdirSync(join(resultsDir, 'summary'), { recursive: true })
  writeJson(join('summary', 'latest.json'), summary)

  // history snapshot (immutable)
  if (!noHistory) {
    const stamp = `${started.replace(/[:.]/g, '-')}_${collected[0]?.meta.commitShort ?? 'nogit'}`
    const histDir = join('history', stamp)
    mkdirSync(join(resultsDir, histDir), { recursive: true })
    writeJson(join(histDir, 'summary.json'), summary)
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

main()
