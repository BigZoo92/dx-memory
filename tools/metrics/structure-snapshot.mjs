#!/usr/bin/env node
// Builds the internal-structure snapshot consumed by apps/metrics-dashboard.
//
// One question, answered deterministically: which INTERNAL units (apps, packages,
// crates) does each variant's deliverable surface depend on, and how are they wired?
//
// Sources:
//   - TypeScript side: the real Nx project graph (`nx graph --file`), static edges only,
//     npm:* targets excluded.
//   - Rust side (Overfit): the workspace members of Cargo.toml and each member's
//     `[dependencies]` section (production dependencies; dev-dependencies excluded).
//     No cargo invocation needed — manifests are parsed directly.
//
// Perimeter (homogeneous across variants): the deliverable apps of the variant, plus
// every internal unit transitively reachable from them through the edges above.
// External packages (npm, crates.io) never appear.
//
// The output (apps/metrics-dashboard/src/bench/structure-snapshot.json) is committed:
// the dashboard never runs Nx or Cargo at runtime. Node/edge lists are direct
// extractions; counts/degrees/depths are reproducible derivations.
//
// Usage: node tools/metrics/structure-snapshot.mjs [--check]
//   --check  regenerate and exit non-zero if the committed snapshot differs.

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..', '..')
const OUT = resolve(repoRoot, 'apps/metrics-dashboard/src/bench/structure-snapshot.json')
const CHECK = process.argv.includes('--check')

// ---------------------------------------------------------------------------
// TypeScript side — real Nx project graph
// ---------------------------------------------------------------------------
function readNxGraph() {
  const dir = mkdtempSync(join(tmpdir(), 'nx-graph-'))
  const file = join(dir, 'graph.json')
  try {
    execFileSync('pnpm', ['nx', 'graph', `--file=${file}`], {
      cwd: repoRoot,
      stdio: ['ignore', 'ignore', 'inherit']
    })
    return JSON.parse(readFileSync(file, 'utf8')).graph
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

// ---------------------------------------------------------------------------
// Rust side — Cargo workspace manifests (no cargo binary required)
// ---------------------------------------------------------------------------
function readCargoWorkspace() {
  const rootManifest = readFileSync(resolve(repoRoot, 'Cargo.toml'), 'utf8')
  const membersBlock = rootManifest.match(/members\s*=\s*\[([^\]]*)\]/)
  if (!membersBlock) throw new Error('Cargo.toml: no workspace members found')
  const members = [...membersBlock[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])

  const crates = new Map() // name -> { path, deps: string[] }
  const manifests = new Map() // name -> raw manifest (second pass needs member names)
  for (const member of members) {
    const manifest = readFileSync(resolve(repoRoot, member, 'Cargo.toml'), 'utf8')
    const name = manifest.match(/^\s*name\s*=\s*"([^"]+)"/m)?.[1]
    if (!name) throw new Error(`${member}/Cargo.toml: no package name`)
    crates.set(name, { path: member, deps: [] })
    manifests.set(name, manifest)
  }
  for (const [name, manifest] of manifests) {
    // Production [dependencies] section only (dev-dependencies excluded).
    let inDeps = false
    for (const line of manifest.split('\n')) {
      const header = line.match(/^\s*\[([^\]]+)\]/)?.[1]
      if (header !== undefined) {
        inDeps = header === 'dependencies'
        continue
      }
      if (!inDeps) continue
      const dep = line.match(/^\s*([A-Za-z0-9_-]+)\s*=/)?.[1]
      if (dep && crates.has(dep) && dep !== name) crates.get(name).deps.push(dep)
    }
  }
  return crates
}

// ---------------------------------------------------------------------------
// Unified internal graph, then per-variant reachability from deliverable apps
// ---------------------------------------------------------------------------
const nx = readNxGraph()
const cargo = readCargoWorkspace()

const adjacency = new Map() // id -> Set of internal dependency ids
const nodeMeta = new Map() // id -> { tech, path }

for (const [name, node] of Object.entries(nx.nodes)) {
  adjacency.set(name, new Set())
  nodeMeta.set(name, { tech: 'ts', path: node.data?.root ?? '' })
}
for (const [name, deps] of Object.entries(nx.dependencies)) {
  for (const d of deps) {
    if (d.type !== 'static') continue
    if (d.target.startsWith('npm:')) continue
    adjacency.get(name)?.add(d.target)
  }
}
for (const [name, crate] of cargo) {
  // overfit-api exists on both sides (Nx project + Cargo binary): merge, keep tech=rust
  if (!adjacency.has(name)) adjacency.set(name, new Set())
  for (const dep of crate.deps) adjacency.get(name).add(dep)
  nodeMeta.set(name, { tech: 'rust', path: crate.path })
}

const VARIANT_ROOTS = {
  flow: ['flow-app'],
  friction: ['friction-web', 'friction-api'],
  overfit: ['overfit-web', 'overfit-api']
}

for (const roots of Object.values(VARIANT_ROOTS)) {
  for (const r of roots) {
    if (!adjacency.has(r)) throw new Error(`deliverable app not found in any graph: ${r}`)
  }
}

function extractVariant(variant, roots) {
  // Reachable subgraph (BFS), plus shortest depth from the nearest deliverable app.
  const depth = new Map(roots.map((r) => [r, 0]))
  const queue = [...roots]
  while (queue.length) {
    const cur = queue.shift()
    for (const dep of adjacency.get(cur) ?? []) {
      if (!depth.has(dep)) {
        depth.set(dep, depth.get(cur) + 1)
        queue.push(dep)
      }
    }
  }
  const ids = [...depth.keys()].sort()
  const idSet = new Set(ids)
  const nodes = ids.map((id) => ({
    id,
    tech: nodeMeta.get(id).tech,
    kind: roots.includes(id) ? 'app' : 'unit',
    depth: depth.get(id),
    path: nodeMeta.get(id).path
  }))
  const edges = []
  for (const id of ids) {
    for (const dep of adjacency.get(id) ?? []) {
      if (idSet.has(dep)) edges.push({ from: id, to: dep })
    }
  }
  edges.sort((a, b) => (a.from + '→' + a.to).localeCompare(b.from + '→' + b.to))

  const outDeg = new Map(ids.map((id) => [id, 0]))
  const inDeg = new Map(ids.map((id) => [id, 0]))
  for (const e of edges) {
    outDeg.set(e.from, outDeg.get(e.from) + 1)
    inDeg.set(e.to, inDeg.get(e.to) + 1)
  }

  // Connected components on the undirected subgraph.
  const seen = new Set()
  let components = 0
  const undirected = new Map(ids.map((id) => [id, new Set()]))
  for (const e of edges) {
    undirected.get(e.from).add(e.to)
    undirected.get(e.to).add(e.from)
  }
  for (const id of ids) {
    if (seen.has(id)) continue
    components += 1
    const stack = [id]
    seen.add(id)
    while (stack.length) {
      for (const n of undirected.get(stack.pop())) {
        if (!seen.has(n)) {
          seen.add(n)
          stack.push(n)
        }
      }
    }
  }

  return {
    roots: [...roots].sort(),
    nodes,
    edges,
    metrics: {
      internalNodeCount: nodes.length,
      internalEdgeCount: edges.length,
      maxInternalOutDegree: Math.max(0, ...outDeg.values()),
      maxInternalInDegree: Math.max(0, ...inDeg.values()),
      maxDepthFromApp: Math.max(0, ...nodes.map((n) => n.depth)),
      connectedComponents: components
    }
  }
}

const snapshot = {
  $schema: 'signalops/structure-snapshot@1',
  generatedBy: 'tools/metrics/structure-snapshot.mjs',
  method: {
    perimeter:
      'Unités internes au repo uniquement (apps, packages, crates), atteignables depuis les ' +
      'apps livrables de chaque variante. Dépendances externes (npm, crates.io) exclues.',
    tsSource: 'nx graph --file (arêtes static, cibles npm:* exclues)',
    rustSource:
      'Cargo.toml du workspace + section [dependencies] de chaque membre ' +
      '(dépendances de production ; dev-dependencies exclues)',
    note:
      'Photographie structurelle, hors CTL. Les topologies mélangent des technologies ' +
      'différentes : les tailles de graphe ne se lisent pas comme un score de complexité ' +
      'cognitive ni comme une preuve causale.',
    levels: {
      nodesAndEdges: 'direct',
      metrics: 'derived'
    }
  },
  variants: Object.fromEntries(
    Object.entries(VARIANT_ROOTS).map(([variant, roots]) => [variant, extractVariant(variant, roots)])
  )
}

const json = JSON.stringify(snapshot, null, 2) + '\n'
if (CHECK) {
  const current = readFileSync(OUT, 'utf8')
  if (current !== json) {
    console.error('structure snapshot drift: committed JSON differs from regenerated output')
    process.exit(1)
  }
  console.log('structure snapshot up to date')
} else {
  writeFileSync(OUT, json)
  console.log(`wrote ${OUT}`)
}
