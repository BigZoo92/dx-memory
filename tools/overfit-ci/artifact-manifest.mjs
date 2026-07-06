#!/usr/bin/env node
/**
 * Reproducible artifact manifest for Overfit.
 *
 * This is intentionally more ceremony than the product needs: release-critical inputs are hashed
 * into a committed manifest, and the quality gate fails when any input drifts without regenerating
 * the manifest. The local win is real provenance; the maintenance cost is the manifest surface.
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const manifestPath = 'generated/overfit/artifact-manifest.json'

const ARTIFACT_INPUTS = [
  '.github/workflows/overfit-ci.yml',
  'apps/overfit-api/Dockerfile',
  'apps/overfit-api/Cargo.toml',
  'apps/overfit-web/Dockerfile',
  'apps/overfit-web/next.config.ts',
  'apps/overfit-web/project.json',
  'Cargo.lock',
  'Cargo.toml',
  'generated/overfit/bundle-budget.json',
  'generated/overfit/contracts.lock.json',
  'generated/overfit/openapi.json',
  'nx.json',
  'package.json',
  'packages/overfit/generated-manifests/src/endpoint.manifest.json',
  'tools/metrics/config/variants.config.json',
  'tools/overfit-ci/artifact-manifest.mjs',
  'tools/overfit-ci/cache-key.mjs',
  'tools/overfit-ci/scope-manifest.json'
]

export function buildManifest(root = repoRoot) {
  const files = ARTIFACT_INPUTS.map((path) => {
    const abs = resolve(root, path)
    if (!existsSync(abs)) {
      return { path, status: 'missing', bytes: 0, sha256: null }
    }
    const content = readFileSync(abs)
    return {
      path,
      status: 'ok',
      bytes: content.length,
      sha256: createHash('sha256').update(content).digest('hex')
    }
  })

  const material = stableJson(files)
  return {
    manifestVersion: '1.0.0',
    variant: 'overfit',
    purpose: 'release artifact provenance and cache-input drift detection',
    inputs: files,
    aggregateSha256: createHash('sha256').update(material).digest('hex')
  }
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(',')}]`
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

function render(manifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`
}

function assertComplete(manifest) {
  const missing = manifest.inputs.filter((input) => input.status !== 'ok')
  if (missing.length > 0) {
    throw new Error(`missing artifact inputs: ${missing.map((input) => input.path).join(', ')}`)
  }
}

function check(root = repoRoot) {
  const abs = resolve(root, manifestPath)
  if (!existsSync(abs)) throw new Error(`${manifestPath} is missing; run pnpm overfit:artifacts:write`)
  const expected = render(buildManifest(root))
  const actual = readFileSync(abs, 'utf8')
  if (actual !== expected) {
    throw new Error(`${manifestPath} is stale; run pnpm overfit:artifacts:write`)
  }
}

function write(root = repoRoot) {
  const manifest = buildManifest(root)
  assertComplete(manifest)
  writeFileSync(resolve(root, manifestPath), render(manifest))
  return manifest
}

const invokedAsCli = process.argv[1] && relative(repoRoot, process.argv[1]).replace(/\\/g, '/') === 'tools/overfit-ci/artifact-manifest.mjs'

if (invokedAsCli) {
  try {
    if (process.argv.includes('--write')) {
      const manifest = write()
      console.log(`wrote ${manifestPath} (${manifest.inputs.length} inputs, ${manifest.aggregateSha256.slice(0, 12)})`)
    } else if (process.argv.includes('--check')) {
      check()
      console.log(`${manifestPath} is current`)
    } else {
      const manifest = buildManifest()
      assertComplete(manifest)
      process.stdout.write(render(manifest))
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
