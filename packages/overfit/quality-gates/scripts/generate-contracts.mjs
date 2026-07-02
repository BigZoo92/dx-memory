// Regenerate the contract lock from the OpenAPI document. In a full codegen setup this would emit
// the TypeScript client too; here it records the schema/operation surface + a hash so the drift
// check can catch any divergence between generated/overfit/openapi.json and the committed contracts.
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { REPO_ROOT, readJson } from './_lib.mjs'

const openapi = readJson('generated/overfit/openapi.json')
const schemas = Object.keys(openapi.components?.schemas ?? {}).sort()
const operations = Object.entries(openapi.paths ?? {})
  .flatMap(([route, methods]) =>
    Object.entries(methods).map(([method, op]) => `${method.toUpperCase()} ${route} :: ${op.operationId ?? ''}`)
  )
  .sort()

const material = JSON.stringify({ schemas, operations })
const hash = createHash('sha256').update(material).digest('hex')

const lock = {
  $generated: true,
  source: 'generated/overfit/openapi.json',
  schemaCount: schemas.length,
  operationCount: operations.length,
  schemas,
  operations,
  hash
}

writeFileSync(resolve(REPO_ROOT, 'generated/overfit/contracts.lock.json'), JSON.stringify(lock, null, 2) + '\n')
console.log(`generated contracts.lock.json (${schemas.length} schemas, ${operations.length} operations, hash ${hash.slice(0, 12)})`)
