#!/usr/bin/env node
/**
 * Overfit CI isolation verifier — the deliberately over-engineered garde-fou.
 *
 * Where Flow's guard is one nx call and a set-intersection, Overfit's is a full
 * graph-closure proof driven by a declarative manifest (scope-manifest.json):
 *
 *   1. Materialize the REAL Nx project graph (nx graph --file).
 *   2. Compute the transitive dependency closure of the declared Overfit roots.
 *   3. Assert the closure == the `scope:overfit` tag selection (no drift between
 *      "what Overfit depends on" and "what is tagged Overfit").
 *   4. Assert no node in the closure carries a forbidden scope, and no dependency
 *      EDGE crosses from Overfit into another variant (leak detection at edge level).
 *   5. Assert every requiredProject is present and the count is within bounds.
 *   6. Emit a structured JSON report (tools/metrics/results/ci/overfit-isolation.json)
 *      for the metrics pipeline / audit trail.
 *
 * Exit non-zero on ANY violation. This is a quality gate, not a probe.
 *
 * Usage: node tools/overfit-ci/verify-isolation.mjs [--report <path>] [--quiet]
 */
import { execSync } from 'node:child_process'
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..', '..')
const manifest = JSON.parse(readFileSync(join(here, 'scope-manifest.json'), 'utf8'))

const argv = process.argv.slice(2)
const quiet = argv.includes('--quiet')
const reportPath =
  (argv.includes('--report') && argv[argv.indexOf('--report') + 1]) ||
  join(repoRoot, 'tools/metrics/results/ci/overfit-isolation.json')

const log = (m) => {
  if (!quiet) process.stdout.write(`${m}\n`)
}

function loadGraph() {
  const tmp = join(tmpdir(), `overfit-nx-graph-${process.pid}.json`)
  execSync(`pnpm exec nx graph --file=${tmp}`, {
    cwd: repoRoot,
    stdio: 'ignore',
    env: { ...process.env, NX_DAEMON: 'false' }
  })
  const raw = JSON.parse(readFileSync(tmp, 'utf8'))
  rmSync(tmp, { force: true })
  const g = raw.graph || raw
  return { nodes: g.nodes, deps: g.dependencies }
}

function scopeOf(node) {
  const tags = (node?.data?.tags || []).filter((t) => t.startsWith('scope:'))
  return tags[0] || '(unscoped)'
}

function closure(roots, deps, nodes) {
  const seen = new Set()
  const stack = [...roots]
  const edges = []
  while (stack.length) {
    const cur = stack.pop()
    for (const d of deps[cur] || []) {
      if (!nodes[d.target]) continue // external npm package, ignore
      edges.push({ from: cur, to: d.target })
      if (!seen.has(d.target)) {
        seen.add(d.target)
        stack.push(d.target)
      }
    }
  }
  return { members: seen, edges }
}

const violations = []
const push = (rule, detail) => violations.push({ rule, detail })

log('◆ Overfit CI isolation verifier')
const { nodes, deps } = loadGraph()

// -- (0) roots exist -------------------------------------------------------------
const roots = manifest.roots.filter((r) => nodes[r])
for (const r of manifest.roots) if (!nodes[r]) push('missing-root', r)

// -- (1) closure of the declared roots -------------------------------------------
const { members, edges } = closure(roots, deps, nodes)
const closureSet = new Set([...roots, ...members])

// -- (2) tag selection (what nx thinks is Overfit) --------------------------------
function tagSelection(selector) {
  const out = execSync(`pnpm exec nx show projects --projects=${selector} --json`, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, NX_DAEMON: 'false' }
  })
  return new Set(JSON.parse(out.slice(out.indexOf('['))))
}
const tagged = tagSelection(`tag:${manifest.ownScope}`)

// closure vs tag drift: every closure member must be tagged overfit (self-contained)
for (const p of closureSet) {
  if (!tagged.has(p)) push('closure-not-tagged-overfit', `${p} [${scopeOf(nodes[p])}]`)
}

// -- (3) forbidden scope in closure ----------------------------------------------
const forbidden = new Set(manifest.forbiddenScopes)
for (const p of closureSet) {
  const s = scopeOf(nodes[p])
  if (forbidden.has(s)) push('forbidden-scope-in-closure', `${p} carries ${s}`)
}

// -- (4) leaking edges (Overfit -> foreign variant) ------------------------------
for (const e of edges) {
  const toScope = scopeOf(nodes[e.to])
  if (forbidden.has(toScope)) push('cross-variant-edge', `${e.from} -> ${e.to} (${toScope})`)
}

// -- (5) required projects + count bounds ----------------------------------------
for (const req of manifest.requiredProjects) {
  if (!tagged.has(req)) push('missing-required-project', req)
}
const { min, max } = manifest.expectedProjectCount
if (tagged.size < min || tagged.size > max) {
  push('count-out-of-bounds', `${tagged.size} not in [${min}, ${max}]`)
}

// -- report ----------------------------------------------------------------------
const report = {
  variant: 'overfit',
  manifestVersion: manifest.manifestVersion,
  generatedAt: new Date().toISOString(),
  roots,
  closureSize: closureSet.size,
  taggedSize: tagged.size,
  members: [...closureSet].sort(),
  scopes: [...closureSet].sort().map((p) => ({ project: p, scope: scopeOf(nodes[p]) })),
  status: violations.length === 0 ? 'isolated' : 'violated',
  violations
}
mkdirSync(dirname(reportPath), { recursive: true })
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

log(`  roots            ${roots.join(', ')}`)
log(`  closure          ${closureSet.size} projects`)
log(`  scope:overfit    ${tagged.size} projects`)
log(`  report           ${reportPath.replace(`${repoRoot}/`, '')}`)

if (violations.length > 0) {
  log(`\n✗ Overfit isolation VIOLATED (${violations.length}):`)
  for (const v of violations) log(`  [${v.rule}] ${v.detail}`)
  process.exit(1)
}
log('\n✓ Overfit is fully isolated: closure == scope:overfit, no foreign scope, no cross-variant edge.')
