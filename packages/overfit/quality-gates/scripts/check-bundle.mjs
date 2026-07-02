// Bundle-budget gate. The client bundle must stay under budget. Reads the seed/collected stats and
// the committed budget.
import { readJson, pass, fail } from './_lib.mjs'

const GATE = 'bundle'

const budget = readJson('generated/overfit/bundle-budget.json')
const stats = readJson('generated/overfit/bundle-stats.json')

if (stats.bundleSizeKb > budget.maxBundleKb) {
  fail(GATE, `bundle ${stats.bundleSizeKb}KB exceeds budget ${budget.maxBundleKb}KB`)
} else {
  pass(GATE, `bundle ${stats.bundleSizeKb}KB within budget ${budget.maxBundleKb}KB`)
}
if (stats.mainChunkSizeKb > budget.maxMainChunkKb) {
  fail(GATE, `main chunk ${stats.mainChunkSizeKb}KB exceeds budget ${budget.maxMainChunkKb}KB`)
} else {
  pass(GATE, `main chunk ${stats.mainChunkSizeKb}KB within budget ${budget.maxMainChunkKb}KB`)
}

process.exit(process.exitCode ?? 0)
