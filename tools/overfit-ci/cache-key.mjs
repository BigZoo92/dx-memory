#!/usr/bin/env node
/**
 * Overfit CI composite cache-key calculator.
 *
 * Deliberately over-engineered: GitHub Actions already ships `hashFiles()`, but Overfit's
 * philosophy is maximal local optimization, so it computes its own per-layer content hashes
 * with an explicit cascade (primary key + ordered restore-key prefixes) for SIX cache
 * layers. Flow, by contrast, uses two one-line `actions/cache` keys and stops.
 *
 * Each layer key = `<prefix>-<runnerOs>-<contentHash>` where contentHash is sha256 over the
 * sorted contents of the layer's declared inputs. Restore-keys drop the content hash (then
 * the OS) so a near-miss still restores a warm base.
 *
 * Usage:
 *   node tools/overfit-ci/cache-key.mjs                # human table
 *   node tools/overfit-ci/cache-key.mjs --github       # write name=key + name-restore=... to $GITHUB_OUTPUT
 *   node tools/overfit-ci/cache-key.mjs --layer nx     # print a single primary key
 *   node tools/overfit-ci/cache-key.mjs --json         # machine JSON
 *
 * Env: RUNNER_OS (GitHub sets it; falls back to process.platform).
 */
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync, existsSync, appendFileSync } from 'node:fs'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const runnerOs = process.env.RUNNER_OS || process.platform
const SRC_EXT = new Set(['.ts', '.tsx', '.rs', '.json', '.mjs', '.js', '.cjs'])

// The seven Overfit cache layers and the inputs that invalidate each.
const LAYERS = {
  pnpm: { prefix: 'overfit-pnpm', inputs: ['pnpm-lock.yaml'] },
  nx: { prefix: 'overfit-nx', inputs: ['pnpm-lock.yaml', 'nx.json', 'tsconfig.base.json'] },
  cargoRegistry: { prefix: 'overfit-cargo-registry', inputs: ['Cargo.lock'] },
  cargoGit: { prefix: 'overfit-cargo-git', inputs: ['Cargo.lock'] },
  cargoTarget: { prefix: 'overfit-cargo-target', inputs: ['Cargo.lock', 'Cargo.toml', 'crates', 'apps/overfit-api/src'] },
  next: { prefix: 'overfit-next', inputs: ['pnpm-lock.yaml', 'apps/overfit-web/app', 'apps/overfit-web/next.config.ts'] }
}

function collectFiles(abs, acc) {
  let st
  try {
    st = statSync(abs)
  } catch {
    return
  }
  if (st.isDirectory()) {
    for (const e of readdirSync(abs).sort()) {
      if (e === 'node_modules' || e === '.next' || e === 'dist' || e === 'target') continue
      collectFiles(join(abs, e), acc)
    }
  } else if (SRC_EXT.has(extname(abs))) {
    acc.push(abs)
  }
}

function contentHash(inputs) {
  const h = createHash('sha256')
  for (const input of inputs) {
    const abs = join(repoRoot, input)
    if (!existsSync(abs)) {
      h.update(`missing:${input}\0`)
      continue
    }
    const files = []
    if (statSync(abs).isDirectory()) collectFiles(abs, files)
    else files.push(abs)
    for (const f of files.sort()) {
      h.update(f.replace(repoRoot, ''))
      h.update(readFileSync(f))
      h.update('\0')
    }
  }
  return h.digest('hex').slice(0, 16)
}

function keyFor(name) {
  const { prefix, inputs } = LAYERS[name]
  const hash = contentHash(inputs)
  const primary = `${prefix}-${runnerOs}-${hash}`
  const restore = [`${prefix}-${runnerOs}-`, `${prefix}-`]
  return { primary, restore }
}

const argv = process.argv.slice(2)
const single = argv.includes('--layer') ? argv[argv.indexOf('--layer') + 1] : null

if (single) {
  if (!LAYERS[single]) {
    process.stderr.write(`Unknown layer '${single}'. Known: ${Object.keys(LAYERS).join(', ')}\n`)
    process.exit(1)
  }
  process.stdout.write(`${keyFor(single).primary}\n`)
} else if (argv.includes('--json')) {
  const out = {}
  for (const name of Object.keys(LAYERS)) out[name] = keyFor(name)
  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`)
} else if (argv.includes('--github')) {
  const target = process.env.GITHUB_OUTPUT
  if (!target) {
    process.stderr.write('GITHUB_OUTPUT is not set — run this inside a GitHub Actions step.\n')
    process.exit(1)
  }
  // multiline restore values use the heredoc form.
  const rendered = []
  for (const name of Object.keys(LAYERS)) {
    const { primary, restore } = keyFor(name)
    rendered.push(`${name}=${primary}`)
    rendered.push(`${name}_restore<<EOF`)
    rendered.push(restore.join('\n'))
    rendered.push('EOF')
  }
  appendFileSync(target, `${rendered.join('\n')}\n`)
  process.stdout.write(`Wrote ${Object.keys(LAYERS).length} layer keys to $GITHUB_OUTPUT\n`)
} else {
  process.stdout.write(`Overfit cache keys (runnerOs=${runnerOs}):\n`)
  for (const name of Object.keys(LAYERS)) {
    const { primary, restore } = keyFor(name)
    process.stdout.write(`\n  ${name}\n    primary: ${primary}\n    restore: ${restore.join(' | ')}\n`)
  }
}
