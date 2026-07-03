#!/usr/bin/env node
/**
 * Variant-level CI collection entry point.
 *
 * Runs one (or all) variant's real CI commands + Docker probe and writes a self-describing
 * JSON artifact the main collector reads back as `scope:'variant'` metrics:
 *
 *   tools/metrics/results/ci/<variant>.json
 *
 * Usage:
 *   node tools/metrics/collect-variant.mjs --variant flow
 *   node tools/metrics/collect-variant.mjs --variant friction --no-docker
 *   node tools/metrics/collect-variant.mjs --variant overfit --steps typecheck,lint
 *   node tools/metrics/collect-variant.mjs --all
 *
 * (or via package.json: `pnpm metrics:variant --variant flow`)
 *
 * Always exits 0 (best-effort measurement): the *gating* CI is the per-variant *-ci.yml
 * workflows. Failures are recorded in the JSON, not raised as a non-zero exit.
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runVariant } from './lib/variant-runner.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..', '..')
const ciDir = join(here, 'results', 'ci')

function parseArgs(argv) {
  const out = { variant: null, all: false, steps: null, docker: true, hostPort: undefined }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--variant' || a === '-v') out.variant = argv[++i]
    else if (a.startsWith('--variant=')) out.variant = a.slice('--variant='.length)
    else if (a === '--all') out.all = true
    else if (a === '--no-docker') out.docker = false
    else if (a === '--steps') out.steps = argv[++i]?.split(',').map((s) => s.trim()).filter(Boolean)
    else if (a.startsWith('--steps=')) out.steps = a.slice('--steps='.length).split(',').map((s) => s.trim()).filter(Boolean)
    else if (a === '--host-port') out.hostPort = Number.parseInt(argv[++i], 10)
  }
  return out
}

function log(msg) {
  process.stdout.write(`${msg}\n`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const cfg = JSON.parse(readFileSync(join(here, 'config', 'variants.config.json'), 'utf8'))
  const byId = new Map(cfg.variants.map((v) => [v.id, v]))

  let targets
  if (args.all) targets = cfg.variants
  else if (args.variant && byId.has(args.variant)) targets = [byId.get(args.variant)]
  else {
    log(`✗ Unknown or missing --variant. Expected one of: ${[...byId.keys()].join(', ')} (or --all).`)
    process.exit(1) // usage error is the one hard failure — nothing was measured.
  }

  const now = new Date().toISOString()
  mkdirSync(ciDir, { recursive: true })

  for (const variant of targets) {
    log(`\n◆ Variant CI — ${variant.label} (${variant.id})`)
    log(`  steps: ${(args.steps ?? ['build', 'typecheck', 'lint', 'test']).join(', ')}${args.docker ? ' · docker' : ' · (docker skipped)'}`)
    const result = await runVariant(variant, repoRoot, { steps: args.steps, docker: args.docker, hostPort: args.hostPort, now })

    for (const [step, r] of Object.entries(result.steps)) {
      const dur = typeof r.durationMs === 'number' ? `${(r.durationMs / 1000).toFixed(1)}s` : '—'
      const ram = typeof r.ramPeakKb === 'number' ? ` · ${(r.ramPeakKb / 1024).toFixed(0)}MB peak` : ''
      log(`  ${step.padEnd(10)} ${String(r.status).padEnd(11)} ${dur}${ram}`)
    }
    if (result.steps.test?.tests) {
      const t = result.steps.test.tests
      log(`  tests      executed ${t.executed ?? '—'} · passed ${t.passed ?? '—'} · failed ${t.failed ?? '—'} · skipped ${t.skipped ?? '—'}`)
    }
    log(`  diagnostics warnings ${result.diagnostics.warnings} · errors ${result.diagnostics.errors}`)
    log(`  artifact   ${result.artifact.status === 'ok' ? `${result.artifact.distSizeKb} KB` : result.artifact.reason}`)
    log(`  docker     ${result.docker.status}${result.docker.reason ? ` (${result.docker.reason})` : ''}`)
    if (result.docker.imageStats?.status === 'ok') {
      log(`             image ${(result.docker.imageStats.sizeKb / 1024).toFixed(1)} MB · ${result.docker.imageStats.layers} layers`)
    }

    const file = join(ciDir, `${variant.id}.json`)
    writeFileSync(file, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
    log(`  ✓ tools/metrics/results/ci/${variant.id}.json`)
  }

  log(`\n✓ Variant CI collection complete. Re-run \`pnpm metrics:dynamic\` to fold these into the summary.\n`)
}

await main()
