#!/usr/bin/env node
/**
 * Collects REAL Flow build/bundle metrics from the existing production build and writes a
 * report. It never invents numbers: if `dist/client` is missing it asks you to build first.
 *
 * Usage:
 *   pnpm --filter @signalops/flow-app build
 *   pnpm --filter @signalops/flow-app metrics:collect
 */
import { readdirSync, statSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const appRoot = join(here, '..')
const clientAssets = join(appRoot, 'dist', 'client', 'assets')

function kb(bytes) {
  return Math.round(bytes / 1024)
}

if (!existsSync(clientAssets)) {
  console.error(
    'No build found at dist/client. Run `pnpm --filter @signalops/flow-app build` first.'
  )
  process.exit(1)
}

const jsFiles = readdirSync(clientAssets)
  .filter((f) => f.endsWith('.js'))
  .map((f) => ({ file: f, bytes: statSync(join(clientAssets, f)).size }))

const totalBytes = jsFiles.reduce((sum, f) => sum + f.bytes, 0)
const mainChunk = jsFiles.reduce((biggest, f) => (f.bytes > biggest.bytes ? f : biggest), {
  bytes: 0
})

const report = {
  variant: 'flow',
  collectedAt: new Date().toISOString(),
  source: 'collected',
  bundleSizeKb: kb(totalBytes),
  mainChunkSizeKb: kb(mainChunk.bytes),
  jsAssetCount: jsFiles.length,
  note: 'Real client bundle sizes measured from dist/client/assets. Build/test/typecheck timings are collected in CI (see flow-ci.yml).'
}

const outFile = join(appRoot, 'metrics.flow.json')
writeFileSync(outFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

console.log('Flow metrics collected:')
console.log(`  bundle size     ${report.bundleSizeKb} KB (${report.jsAssetCount} JS assets)`)
console.log(`  main chunk      ${report.mainChunkSizeKb} KB`)
console.log(`  → ${outFile}`)
