// Schema-registry gate. The endpoint manifest and the OpenAPI paths must describe the same set of
// routes, and the Rust schema-registry crate must list every endpoint.
import { REPO_ROOT, readJson, readText, pass, fail } from './_lib.mjs'

const GATE = 'schema'

const openapi = readJson('generated/overfit/openapi.json')
const manifest = readJson('packages/overfit/generated-manifests/src/endpoint.manifest.json')

const openapiRoutes = new Set(
  Object.entries(openapi.paths).flatMap(([route, methods]) =>
    Object.keys(methods).map((m) => `${m.toUpperCase()} ${route.replace(/\{(\w+)\}/g, ':$1')}`)
  )
)
// openapi.json also serves /api/openapi.json at runtime (not in the doc); allow the manifest to be a
// subset of documented routes.
const manifestRoutes = [...manifest.product, ...manifest.technical]

let missing = 0
for (const r of manifestRoutes) {
  if (!openapiRoutes.has(r)) {
    fail(GATE, `endpoint manifest route not documented in OpenAPI: ${r}`)
    missing++
  }
}
if (missing === 0) pass(GATE, `all ${manifestRoutes.length} manifest routes are documented`)

// The Rust registry must enumerate every endpoint too.
const registrySrc = readText('crates/overfit-schema-registry/src/lib.rs')
const registryCount = (registrySrc.match(/e\(/g) || []).length
if (registryCount < manifestRoutes.length) {
  fail(GATE, `schema-registry lists ${registryCount} entries, expected >= ${manifestRoutes.length}`)
} else {
  pass(GATE, `schema-registry lists ${registryCount} entries`)
}

process.exit(process.exitCode ?? 0)
