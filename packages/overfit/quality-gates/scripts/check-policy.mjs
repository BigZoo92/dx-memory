// Policy-manifest gate. The AI-governance package must define the forbidden-files guard, reviewer
// and ownership matrices, and the risk-trend task manifest.
import { readText, fileExists, pass, fail } from './_lib.mjs'

const GATE = 'policy'

if (!fileExists('packages/overfit/ai-governance/src/index.ts')) {
  fail(GATE, 'ai-governance manifest missing')
  process.exit(1)
}

const src = readText('packages/overfit/ai-governance/src/index.ts')
for (const symbol of [
  'FORBIDDEN_FILES',
  'REVIEWER_MATRIX',
  'OWNERSHIP_MATRIX',
  'RISK_TREND_TASK_MANIFEST',
  'GENERATED_CODE_LABELS'
]) {
  if (!src.includes(symbol)) fail(GATE, `ai-governance missing ${symbol}`)
}

// Forbidden files must include the other variants + product spec.
for (const guard of ['packages/flow/**', 'apps/flow-app/**', 'docs/product/**']) {
  if (!src.includes(guard)) fail(GATE, `forbidden-files guard missing: ${guard}`)
}

if (process.exitCode !== 1) pass(GATE, 'AI-governance policy manifest complete')
process.exit(process.exitCode ?? 0)
