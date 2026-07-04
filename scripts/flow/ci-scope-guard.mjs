#!/usr/bin/env node
// Flow CI scope guard — pragmatic and deterministic.
//
// Asserts the Flow CI only ever runs Flow's own projects and the shared socle
// packages Flow genuinely depends on. If a `scope:overfit` / `scope:friction` /
// `scope:lab` / `scope:metrics` project ever leaks into Flow's selection (a
// mistagged package, a bad dependency edge), this exits non-zero and CI stops.
//
// It trusts the same Nx tag selector the workflow uses, so there is one source of
// truth. No manifest to keep in sync — the guard is ~1 nx call and a set check.
import { execSync } from 'node:child_process'

const ALLOWED = 'tag:scope:flow,tag:scope:shared'
const FORBIDDEN = 'tag:scope:overfit,tag:scope:friction,tag:scope:lab,tag:scope:metrics'

function projects(selector) {
  const out = execSync(`pnpm exec nx show projects --projects=${selector} --json`, {
    encoding: 'utf8',
    env: { ...process.env, NX_DAEMON: 'false' }
  })
  // nx may print a warning line before the JSON; grab the JSON array.
  const json = out.slice(out.indexOf('['))
  return new Set(JSON.parse(json))
}

const flow = projects(ALLOWED)
const forbidden = projects(FORBIDDEN)
const leaks = [...flow].filter((p) => forbidden.has(p)).sort()

console.log(`Flow CI scope: ${flow.size} projects (scope:flow + scope:shared)`)
for (const p of [...flow].sort()) console.log(`  · ${p}`)

if (leaks.length > 0) {
  console.error(`\n✗ Flow CI scope leak — these belong to another variant:\n  ${leaks.join('\n  ')}`)
  console.error('  Fix the offending project tags before this can go green.')
  process.exit(1)
}

console.log('\n✓ No foreign-variant project in Flow CI scope.')
