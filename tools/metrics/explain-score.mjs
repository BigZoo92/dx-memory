#!/usr/bin/env node
/**
 * Deterministic score explanation — the maths behind every number on /metrics.
 *
 * For each variant and each scored axis member: raw value, normalized (ratio-to-best)
 * score, configured weight, effective weight (after renormalization over the measured
 * members), contribution to the axis score, and contribution to the Total Delivery
 * Score. Sums reproduce the published scores exactly — if they don't, the model or the
 * summary is broken and this script is the first witness.
 *
 * Usage:
 *   node tools/metrics/explain-score.mjs             # all variants
 *   node tools/metrics/explain-score.mjs overfit     # one variant
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const summary = JSON.parse(readFileSync(join(here, 'results', 'summary', 'latest.json'), 'utf8'))

const only = process.argv[2] ?? null
const AXES = ['build', 'ship', 'run', 'change']
const axisWeightOf = (axis) => summary.axisWeights[axis[0].toUpperCase() + axis.slice(1)]

const fmt = (v, w = 7) => (v == null ? '—' : String(Math.round(v * 100) / 100)).padStart(w)

for (const v of summary.variants) {
  const id = v.meta.variant
  if (only && id !== only) continue

  // headline renormalization: axes actually measured for this variant
  const measuredAxes = AXES.filter((a) => v.scores[a]?.value != null)
  const headlineWSum = measuredAxes.reduce((s, a) => s + axisWeightOf(a), 0)

  console.log(`\n━━━ ${v.meta.label.toUpperCase()} — Total Delivery Score = ${v.scores.totalDeliveryScore.value} (provisional if coverage < full) ━━━`)
  for (const axis of AXES) {
    const group = summary.scoreGroups[axis]
    const axisScore = v.scores[axis]
    const members = Object.entries(group.members)
    // effective weights: unavailable members are dropped, the rest renormalized
    const present = members.filter(([key]) => summary.normScores[key]?.[id] != null)
    const wSum = present.reduce((s, [, w]) => s + w, 0)
    const headlineShare = axisScore?.value != null ? axisWeightOf(axis) / headlineWSum : 0

    console.log(
      `\n${axis.toUpperCase().padEnd(7)} score=${axisScore?.value ?? 'gated'} coverage=${axisScore?.coverage} · axis weight in total=${(headlineShare * 100).toFixed(1)}%`
    )
    console.log('  metric                                     raw     norm  weight  w-eff  →axis  →total')
    for (const [key, w] of members) {
      const ns = summary.normScores[key]?.[id]
      const raw = v.metrics[key]
      const rawTxt = raw?.status === 'ok' ? raw.value : 'pending'
      const wEff = ns != null ? w / wSum : 0
      const toAxis = ns != null ? ns * wEff : null
      const toTotal = toAxis != null ? toAxis * headlineShare : null
      console.log(
        `  ${key.padEnd(40)} ${String(rawTxt).padStart(7)} ${fmt(ns)} ${String(w).padStart(6)} ${fmt(wEff * 100, 5)}% ${fmt(toAxis, 6)} ${fmt(toTotal, 6)}`
      )
    }
  }

  // Loss vs the per-metric reference (100): where do the points go?
  console.log(`\n  Biggest losses vs the reference (norm 100), weighted into the total:`)
  const losses = []
  for (const axis of AXES) {
    const group = summary.scoreGroups[axis]
    if (v.scores[axis]?.value == null) continue
    const present = Object.entries(group.members).filter(([key]) => summary.normScores[key]?.[id] != null)
    const wSum = present.reduce((s, [, w]) => s + w, 0)
    const headlineShare = axisWeightOf(axis) / headlineWSum
    for (const [key, w] of present) {
      const ns = summary.normScores[key][id]
      losses.push({ key, axis, lost: (100 - ns) * (w / wSum) * headlineShare })
    }
  }
  losses.sort((a, b) => b.lost - a.lost)
  for (const l of losses.slice(0, 8)) {
    console.log(`   -${l.lost.toFixed(1).padStart(5)} pts  ${l.axis.padEnd(6)} ${l.key}`)
  }
}
