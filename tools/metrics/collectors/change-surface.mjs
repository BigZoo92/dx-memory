/**
 * Change-surface metrics: how far does ONE product-contract change propagate?
 *
 * The lab's shared contract (`packages/contracts/src/signal.ts`) is the single
 * source of truth for the Signal shape. A variant that IMPORTS it pays for a
 * contract change once; a variant that RESTATES it (duplicated TS interfaces,
 * Rust structs, hand-written view models) must re-touch every restatement — and
 * keep them in sync — every time the product's data shape moves.
 *
 * We measure this on a canonical, shipped-everywhere field: `riskScore`
 * (TS `riskScore: number` / Rust `pub risk_score: …`). A file counts as a
 * restatement when it DECLARES the field with a type — mere usages don't count,
 * and generated code is excluded by the shared walk() ignore list (regenerating
 * is cheap; hand-maintained duplicates are the real cost).
 *
 * Variant-agnostic by construction: the same two regexes run over every
 * variant's roots. Rename a variant and its number doesn't move.
 */
import { readFileSync } from 'node:fs'
import { join, extname } from 'node:path'
import { walk } from '../lib/fsutil.mjs'
import { ok } from '../lib/metric.mjs'

const TS_DECLARATION = /riskScore\??\s*:\s*number/
const RUST_DECLARATION = /pub\s+risk_score\s*:/
const CODE_EXTS = new Set(['.ts', '.tsx', '.rs'])

export function collectChangeSurface(variant, repoRoot) {
  const files = []
  for (const root of variant.roots ?? []) {
    for (const file of walk(join(repoRoot, root))) {
      if (!CODE_EXTS.has(extname(file))) continue
      let text
      try {
        text = readFileSync(file, 'utf8')
      } catch {
        continue
      }
      if (TS_DECLARATION.test(text) || RUST_DECLARATION.test(text)) {
        files.push(file.slice(repoRoot.length + 1))
      }
    }
  }
  return {
    'change.contract.restatements': ok(files.length, {
      field: 'riskScore',
      files,
      method: 'files under the variant roots that DECLARE the field (TS `riskScore: number` / Rust `pub risk_score:`), hand-written code only'
    })
  }
}
