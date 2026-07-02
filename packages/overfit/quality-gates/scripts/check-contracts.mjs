// Contract drift gate. Recompute the OpenAPI surface hash and compare it to the committed lock.
// Also assert the AI-task capability (RiskTrend) is present in both the schema and the generated
// TypeScript contracts — the change-surface guard for the risk-trend task.
import { createHash } from 'node:crypto'
import { REPO_ROOT, readJson, readText, fileExists, pass, fail } from './_lib.mjs'

const GATE = 'contracts'

if (!fileExists('generated/overfit/contracts.lock.json')) {
  fail(GATE, 'contracts.lock.json missing — run `pnpm overfit:contracts:generate`')
  process.exit(process.exitCode ?? 1)
}

const openapi = readJson('generated/overfit/openapi.json')
const lock = readJson('generated/overfit/contracts.lock.json')

const schemas = Object.keys(openapi.components?.schemas ?? {}).sort()
const operations = Object.entries(openapi.paths ?? {})
  .flatMap(([route, methods]) =>
    Object.entries(methods).map(([method, op]) => `${method.toUpperCase()} ${route} :: ${op.operationId ?? ''}`)
  )
  .sort()
const hash = createHash('sha256').update(JSON.stringify({ schemas, operations })).digest('hex')

if (hash !== lock.hash) {
  fail(GATE, `OpenAPI drift detected. Expected ${lock.hash.slice(0, 12)}, got ${hash.slice(0, 12)}. Run the generator.`)
} else {
  pass(GATE, `no drift (${schemas.length} schemas, ${operations.length} operations)`)
}

// RiskTrend must survive across the whole contract surface.
if (!schemas.includes('RiskTrend')) fail(GATE, 'RiskTrend schema missing from OpenAPI')
const tsContracts = readText('packages/overfit/contracts-generated/src/index.ts')
if (!/riskTrend\?:\s*RiskTrend/.test(tsContracts)) fail(GATE, 'riskTrend field missing from generated TS Signal')
else pass(GATE, 'riskTrend present across OpenAPI + generated TS contracts')

process.exit(process.exitCode ?? 0)
