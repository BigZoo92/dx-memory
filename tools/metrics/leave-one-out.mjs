#!/usr/bin/env node
/**
 * Leave-one-metric-out robustness check.
 *
 * For every scored axis member, recompute all scores WITHOUT it (its group's weights
 * renormalized over the remaining members) and report what happens to the ranking and
 * to each variant's total. Detects a hidden all-powerful metric: if removing one member
 * flips the ranking or moves a total by a large margin, the verdict silently hinges on
 * it and that dependency must be documented.
 *
 * Read-only diagnostics — never modifies the configured model.
 *
 * Usage: node tools/metrics/leave-one-out.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const summary = JSON.parse(readFileSync(join(here, 'results', 'summary', 'latest.json'), 'utf8'))

const AXES = ['build', 'ship', 'run', 'change']
const axisWeightOf = (axis) => summary.axisWeights[axis[0].toUpperCase() + axis.slice(1)]
const ids = summary.variants.map((v) => v.meta.variant)

function totals(excludedKey) {
  const out = {}
  for (const v of summary.variants) {
    const id = v.meta.variant
    let hAcc = 0
    let hW = 0
    for (const axis of AXES) {
      const members = Object.entries(summary.scoreGroups[axis].members).filter(
        ([key]) => key !== excludedKey && summary.normScores[key]?.[id] != null
      )
      const wSum = members.reduce((s, [, w]) => s + w, 0)
      if (wSum <= 0) continue
      const score = members.reduce((s, [key, w]) => s + summary.normScores[key][id] * (w / wSum), 0)
      hAcc += score * axisWeightOf(axis)
      hW += axisWeightOf(axis)
    }
    out[id] = hW > 0 ? hAcc / hW : null
  }
  return out
}

const rank = (t) => ids.slice().sort((a, b) => (t[b] ?? 0) - (t[a] ?? 0))
const fmtTotals = (t, r) => r.map((id) => `${id} ${t[id]?.toFixed(1)}`).join(' > ')

const base = totals(null)
const baseRank = rank(base)
console.log(`Baseline:  ${fmtTotals(base, baseRank)}\n`)
console.log('metric removed                                ranking (Δ = biggest total move)')

const allMembers = [...new Set(AXES.flatMap((a) => Object.keys(summary.scoreGroups[a].members)))]
for (const key of allMembers) {
  const t = totals(key)
  const r = rank(t)
  const flipped = r.join() !== baseRank.join()
  const maxDelta = Math.max(...ids.map((id) => Math.abs((t[id] ?? 0) - (base[id] ?? 0))))
  console.log(
    `${(flipped ? '⚠ ' : '  ') + key.padEnd(44)}${fmtTotals(t, r)}   Δmax ${maxDelta.toFixed(1)}${flipped ? '   ← RANKING CHANGES' : ''}`
  )
}
