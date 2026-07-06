// Run every Overfit quality gate in sequence and summarize. Non-zero exit if any gate fails.
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const GATES = [
  'check-contracts.mjs',
  'check-schema.mjs',
  'check-docs.mjs',
  'check-policy.mjs',
  'check-bundle.mjs',
  'check-artifacts.mjs'
]

let failed = 0
for (const gate of GATES) {
  console.log(`\n── running ${gate} ─────────────────────────────`)
  const res = spawnSync(process.execPath, [resolve(here, gate)], { stdio: 'inherit' })
  if (res.status !== 0) failed++
}

console.log(`\nOverfit quality gates: ${GATES.length - failed}/${GATES.length} passed`)
process.exit(failed === 0 ? 0 : 1)
