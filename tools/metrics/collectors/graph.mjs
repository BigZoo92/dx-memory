/**
 * Internal dependency-graph metrics for a variant, plus circular-dependency detection.
 * Built from the manifest graph (see lib/projectgraph.mjs). We restrict edges to the
 * variant's own projects so each variant is measured on its own internal structure.
 */
import { projectsForVariant } from '../lib/projectgraph.mjs'
import { ok, round } from '../lib/metric.mjs'

/** Tarjan-ish cycle count on the restricted subgraph. Returns number of edges that close a cycle. */
function detectCycles(nodes, adj) {
  const WHITE = 0
  const GRAY = 1
  const BLACK = 2
  const color = new Map(nodes.map((n) => [n, WHITE]))
  let cycleEdges = 0

  function dfs(u) {
    color.set(u, GRAY)
    for (const v of adj.get(u) ?? []) {
      const cv = color.get(v)
      if (cv === GRAY) cycleEdges++ // back edge → cycle
      else if (cv === WHITE) dfs(v)
    }
    color.set(u, BLACK)
  }
  for (const n of nodes) if (color.get(n) === WHITE) dfs(n)
  return cycleEdges
}

export function collectGraph(variant, projects) {
  const own = projectsForVariant(projects, variant)
  const names = new Set(own.map((p) => p.name))
  const nodes = own.map((p) => p.name)

  // restricted adjacency (edges within the variant only)
  const adj = new Map()
  const fanOut = new Map(nodes.map((n) => [n, 0]))
  const fanIn = new Map(nodes.map((n) => [n, 0]))
  let edges = 0

  for (const p of own) {
    const internalDeps = [...p.deps].filter((d) => names.has(d))
    adj.set(p.name, internalDeps)
    fanOut.set(p.name, internalDeps.length)
    edges += internalDeps.length
    for (const d of internalDeps) fanIn.set(d, (fanIn.get(d) ?? 0) + 1)
  }

  const n = nodes.length
  const possible = n > 1 ? n * (n - 1) : 1
  const density = edges / possible
  const fanInVals = [...fanIn.values()]
  const fanOutVals = [...fanOut.values()]
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)

  const central = [...fanIn.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, v]) => ({ name, fanIn: v }))
  const isolated = nodes.filter((name) => (fanIn.get(name) ?? 0) === 0 && (fanOut.get(name) ?? 0) === 0)

  const cycles = detectCycles(nodes, adj)

  return {
    metrics: {
      nxProjects: ok(n),
      graphNodes: ok(n),
      graphEdges: ok(edges),
      graphDensity: ok(round(density, 4)),
      fanInAvg: ok(round(avg(fanInVals), 2)),
      fanOutAvg: ok(round(avg(fanOutVals), 2)),
      fanInMax: ok(fanInVals.length ? Math.max(...fanInVals) : 0),
      fanOutMax: ok(fanOutVals.length ? Math.max(...fanOutVals) : 0),
      circularDeps: ok(cycles)
    },
    // graph payload for the dashboard's architecture viz
    graph: {
      nodes: own.map((p) => ({
        id: p.name,
        short: p.name.replace(/^@signalops\//, '').replace(/^overfit-/, ''),
        dir: p.dir,
        kind: p.kind,
        fanIn: fanIn.get(p.name) ?? 0,
        fanOut: fanOut.get(p.name) ?? 0
      })),
      edges: own.flatMap((p) =>
        [...p.deps].filter((d) => names.has(d)).map((d) => ({ source: p.name, target: d }))
      ),
      central,
      isolated
    }
  }
}
