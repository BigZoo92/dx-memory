#!/usr/bin/env node
/**
 * Weight-sensitivity check for the headline verdict.
 *
 * The Change axis dominates the Total Delivery Score, so this script answers one
 * robustness question: does the RANKING depend on the exact Change weight, or does it
 * hold across every reasonable weighting? For each Change weight in the sweep, the
 * other three axes keep their relative proportions and are rescaled to fill the rest.
 *
 * Read-only: recomputes headline scores from the already-collected summary. It never
 * modifies the configured weights — it exists to PROVE (or disprove) their robustness.
 *
 * Usage: node tools/metrics/sensitivity.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const summary = JSON.parse(readFileSync(join(here, 'results', 'summary', 'latest.json'), 'utf8'))

const AXES = ['Build', 'Ship', 'Run', 'Change']
const base = summary.axisWeights
const othersBase = AXES.filter((a) => a !== 'Change').reduce((s, a) => s + base[a], 0)

const SWEEP = [0.35, 0.4, 0.5, 0.6, 0.7, 0.8]

function headline(variant, changeWeight) {
  let acc = 0
  let wSum = 0
  for (const axis of AXES) {
    const s = variant.scores[axis.toLowerCase()]?.value
    if (s == null) continue
    const w = axis === 'Change' ? changeWeight : base[axis] * ((1 - changeWeight) / othersBase)
    acc += s * w
    wSum += w
  }
  return wSum > 0 ? acc / wSum : null
}

console.log(`Sensitivity of the verdict to the Change weight (configured: ${base.Change})`)
console.log(`(other axes keep their relative proportions: Build ${base.Build} · Ship ${base.Ship} · Run ${base.Run})\n`)
console.log('Change weight   ranking')
for (const w of SWEEP) {
  const ranked = summary.variants
    .map((v) => ({ id: v.meta.variant, score: headline(v, w) }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  const line = ranked.map((r, i) => `${i + 1}. ${r.id} ${r.score?.toFixed(1)}`).join('   ')
  console.log(`  ${(w * 100).toFixed(0).padStart(3)} %        ${line}`)
}
