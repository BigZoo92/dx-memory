/**
 * Dependency-footprint metrics. Direct dependencies are counted precisely from the
 * variant's manifests (npm + Cargo). Transitive dependency count is deliberately NOT
 * emitted: computing it per-variant offline would require resolving the full lockfile
 * graph per project, which is fragile — an honestly absent metric beats a permanent
 * "pending". Circular deps come from the graph collector (single source of truth).
 */
import { projectsForVariant } from '../lib/projectgraph.mjs'
import { ok } from '../lib/metric.mjs'

export function collectDependencies(variant, projects) {
  const own = projectsForVariant(projects, variant)
  const external = new Set()
  const internalNames = new Set(own.map((p) => p.name))
  for (const p of own) {
    for (const dep of p.allDeps) {
      // count only third-party deps (not other in-repo projects, not workspace refs)
      if (!internalNames.has(dep) && !dep.startsWith('@signalops/') && !dep.startsWith('overfit-')) {
        external.add(dep)
      }
    }
  }
  return {
    directDeps: ok(external.size)
  }
}
