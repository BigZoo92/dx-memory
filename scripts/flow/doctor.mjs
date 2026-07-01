// pnpm flow:doctor — verify the local environment is ready for the Flow variant.
import { existsSync, readdirSync } from 'node:fs'
import { section, ok, warn, fail, info, capture, has } from './lib/sh.mjs'

section('Flow doctor')
let blocking = 0

// Node >= 20.11
const node = process.versions.node
const [major, minor] = node.split('.').map(Number)
if (major > 20 || (major === 20 && minor >= 11)) ok(`Node ${node}`)
else {
  fail(`Node ${node} (need >= 20.11)`)
  blocking += 1
}

// pnpm
const pnpm = capture('pnpm -v')
if (pnpm) ok(`pnpm ${pnpm}`)
else {
  fail('pnpm not found (enable corepack or install pnpm >= 9)')
  blocking += 1
}

// lockfile + install
if (existsSync('pnpm-lock.yaml')) ok('pnpm-lock.yaml present')
else {
  fail('pnpm-lock.yaml missing')
  blocking += 1
}
if (existsSync('node_modules')) ok('node_modules present')
else warn('node_modules missing — run `pnpm install`')

// fixtures (generated, git-ignored)
const fixturesDir = 'packages/fixtures/data'
if (existsSync(fixturesDir) && readdirSync(fixturesDir).some((f) => f.endsWith('.json'))) {
  ok('fixtures generated')
} else {
  warn('fixtures missing — run `pnpm fixtures:generate`')
}

// stale dist-types (a previous build left artifacts that can shadow source in editors)
if (existsSync('packages/flow-ui/dist-types') || existsSync('packages/flow-domain/dist-types')) {
  info('legacy top-level packages/flow-* dist-types present (stale build output, safe to ignore)')
}

// optional tooling
info(has('docker') ? 'docker available' : 'docker not found (optional — only for flow:ci:docker)')
info(has('act') ? 'act available (optional)' : 'act not found (optional — only for flow:ci:act)')

console.log('')
if (blocking > 0) {
  fail(`doctor found ${blocking} blocking issue(s)`)
  process.exit(1)
}
ok('doctor passed — environment looks healthy')
