/**
 * Builds the workspace project graph from manifests (package.json + Cargo.toml) instead of
 * the Nx CLI — the Nx daemon needs network/warm-up and times out in restricted envs, while
 * manifests are always present and parse instantly.
 *
 * A "project" is any npm package or Rust crate. An edge A→B means A depends on B where B is
 * another in-repo project (workspace:* / @signalops/* for npm, path/workspace deps for Rust).
 * Each project is attributed to a variant by matching its directory against the variant roots.
 */
import { walk } from './fsutil.mjs'
import { safeRead } from './fsutil.mjs'
import { relative } from 'node:path'

function parseCargoDeps(toml) {
  // capture crate names under [dependencies] / [dev-dependencies] tables. Good enough for
  // in-repo `overfit-*` crates which is all we need for the internal graph.
  const names = new Set()
  const depTableRe = /\[(?:dev-|build-)?dependencies\]([\s\S]*?)(?=\n\[|$)/g
  let m
  while ((m = depTableRe.exec(toml))) {
    const body = m[1]
    const lineRe = /^\s*([A-Za-z0-9_-]+)\s*=/gm
    let lm
    while ((lm = lineRe.exec(body))) names.add(lm[1])
  }
  return names
}

function cargoName(toml) {
  const m = toml.match(/\[package\][\s\S]*?\bname\s*=\s*"([^"]+)"/)
  return m ? m[1] : null
}

/** Build the full graph once; callers filter per-variant. */
export function buildProjectGraph(repoRoot) {
  const roots = ['apps', 'packages', 'crates']
  const projects = new Map() // name -> { name, dir, kind, deps:Set, allDeps:Set }

  // pass 1: discover projects
  const manifests = []
  for (const root of roots) {
    for (const file of walk(`${repoRoot}/${root}`)) {
      const rel = relative(repoRoot, file)
      const depth = rel.split('/').length
      if (file.endsWith('/package.json')) manifests.push({ file, rel, kind: 'npm' })
      else if (file.endsWith('/Cargo.toml') && depth <= 4) manifests.push({ file, rel, kind: 'rust' })
    }
  }

  const npmNames = new Set()
  const rustNames = new Set()
  for (const { file, rel, kind } of manifests) {
    const text = safeRead(file)
    if (kind === 'npm') {
      try {
        const pkg = JSON.parse(text)
        if (!pkg.name) continue
        const dir = rel.replace(/\/package\.json$/, '')
        projects.set(pkg.name, {
          name: pkg.name,
          dir,
          kind: 'npm',
          deps: new Set(),
          allDeps: new Set([
            ...Object.keys(pkg.dependencies ?? {}),
            ...Object.keys(pkg.devDependencies ?? {})
          ])
        })
        npmNames.add(pkg.name)
      } catch {
        /* skip unparseable manifest */
      }
    } else {
      const name = cargoName(text)
      if (!name) continue
      const dir = rel.replace(/\/Cargo\.toml$/, '')
      projects.set(name, {
        name,
        dir,
        kind: 'rust',
        deps: new Set(),
        allDeps: parseCargoDeps(text)
      })
      rustNames.add(name)
    }
  }

  // pass 2: wire internal edges (only to other in-repo projects)
  const internal = new Set(projects.keys())
  for (const p of projects.values()) {
    for (const dep of p.allDeps) {
      if (internal.has(dep) && dep !== p.name) p.deps.add(dep)
    }
  }

  return projects
}

/** All projects belonging to a variant (dir starts with one of its roots). */
export function projectsForVariant(projects, variant) {
  const out = []
  for (const p of projects.values()) {
    if (variant.roots.some((r) => p.dir === r || p.dir.startsWith(`${r}/`))) out.push(p)
  }
  return out
}
