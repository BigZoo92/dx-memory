#!/usr/bin/env node
/**
 * Provenance + completeness gate for the published metrics summary.
 *
 * Two guarantees, enforced in the release pipeline and inside the gateway image build:
 *
 *  1. PROVENANCE — the summary was measured at the SAME commit as the applications being
 *     deployed (`--sha <expected>`). A dashboard showing numbers from another SHA is a
 *     silent lie; a mismatch fails the build. When the expected SHA is `unknown`/empty
 *     (local/dev docker builds), the check is skipped with a warning.
 *
 *  2. COMPLETENESS (`--require-complete`) — every SCORED axis member (the members of the
 *     Build/Ship/Run/Change score groups) has status `ok` for every variant. The published
 *     verdict must never silently rest on a partially-measured axis (e.g. Ship computed
 *     from 2 of its 4 declared members because Docker was absent). Local exploratory runs
 *     may be partial; the published one may not.
 *
 * Usage:
 *   node tools/metrics/verify-summary.mjs [--summary <path>] [--sha <expected>] [--require-complete]
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

function parseArgs(argv) {
  const out = { summary: join(here, 'results', 'summary', 'latest.json'), sha: null, requireComplete: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--summary') out.summary = argv[++i]
    else if (a === '--sha') out.sha = argv[++i]
    else if (a === '--require-complete') out.requireComplete = true
  }
  return out
}

const args = parseArgs(process.argv.slice(2))
let summary
try {
  summary = JSON.parse(readFileSync(args.summary, 'utf8'))
} catch (e) {
  console.error(`✗ Cannot read summary at ${args.summary}: ${e?.message ?? e}`)
  process.exit(1)
}

let failed = false

// ---- 1. Provenance ---------------------------------------------------------
const actualSha = summary.provenance?.commitSha ?? summary.commit ?? null
if (!args.sha || args.sha === 'unknown') {
  console.log(`• provenance: no expected SHA provided (dev build) — skipping the SHA check.`)
} else if (!actualSha) {
  console.error(`✗ provenance: summary carries no commit SHA (provenance.commitSha missing).`)
  failed = true
} else if (actualSha !== args.sha) {
  console.error(`✗ provenance: summary measured at ${actualSha.slice(0, 12)} but deploying ${args.sha.slice(0, 12)}.`)
  console.error(`  Re-measure at the release SHA: pnpm metrics:variant:all && pnpm metrics:dynamic`)
  failed = true
} else {
  console.log(`✓ provenance: summary measured at the deployed SHA (${actualSha.slice(0, 12)}), source=${summary.provenance?.source ?? '?'}.`)
}

// ---- 2. Completeness of the published verdict ------------------------------
const axisGroups = Object.entries(summary.scoreGroups ?? {}).filter(
  ([name, g]) => !name.startsWith('$') && g && typeof g === 'object' && g.kind === 'axis' && g.members
)
const variants = summary.variants ?? []
const missing = []
for (const [axis, group] of axisGroups) {
  for (const key of Object.keys(group.members)) {
    for (const v of variants) {
      const m = v.metrics?.[key]
      if (!m || m.status !== 'ok') {
        missing.push({ axis, key, variant: v.meta?.variant ?? '?', reason: m?.reason ?? 'not collected' })
      }
    }
  }
}

if (missing.length === 0) {
  console.log(`✓ completeness: every scored axis member is measured for all ${variants.length} variants.`)
} else {
  const level = args.requireComplete ? '✗' : '⚠'
  console.log(`${level} completeness: ${missing.length} scored member value(s) missing:`)
  for (const m of missing) {
    console.log(`   ${m.axis.padEnd(7)} ${m.variant.padEnd(9)} ${m.key} — ${String(m.reason).slice(0, 90)}`)
  }
  if (args.requireComplete) failed = true
}

// Axis coverage snapshot (always printed — the inspectable trace the jury can read).
for (const v of variants) {
  const cells = axisGroups
    .map(([axis]) => `${axis}=${v.scores?.[axis]?.value ?? 'gated'}(${v.scores?.[axis]?.coverage ?? '—'})`)
    .join(' · ')
  console.log(`  ${String(v.meta?.variant ?? '?').padEnd(9)} ${cells} · total=${v.scores?.totalDeliveryScore?.value ?? '—'}`)
}

process.exit(failed ? 1 : 0)
