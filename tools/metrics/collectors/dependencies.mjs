/**
 * Dependency-footprint metrics. Direct dependencies are counted precisely from the
 * variant's manifests (npm + Cargo). Transitive dependency count is intentionally reported
 * as `unavailable`: computing it per-variant offline would require resolving the full
 * lockfile graph per project, which is fragile — better to be honest than to guess.
 * Circular deps come from the graph collector (single source of truth).
 */
import { projectsForVariant } from '../lib/projectgraph.mjs'
import { ok, unavailable } from '../lib/metric.mjs'

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
    directDeps: ok(external.size),
    transitiveDeps: unavailable(
      'Per-variant transitive resolution not computed offline; wire `pnpm list --json` / `cargo tree` in a later pass.'
    )
  }
}
