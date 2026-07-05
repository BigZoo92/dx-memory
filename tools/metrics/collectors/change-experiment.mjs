/**
 * Change-experiment collector — the propagation FOOTPRINT of one shared capability.
 *
 * The lab's controlled experiment (docs/product/03-ai-task-protocol.md) asks every
 * variant to absorb the SAME product intent: the "Risk trend" capability (field derived
 * from the common dataset, /signals column + filter, detail view, tests). This collector
 * measures, per variant, WHERE that capability lives in the codebase today. It is a
 * footprint, NOT a historical git diff — never present it as "files modified":
 *
 *   the feature footprint = every file under the variant's roots that carries the
 *   feature's identifiers (declared in variants.config.json `changeExperiment.tokens`),
 *   classified into production source / tests / docs / generated.
 *
 * Method notes (all deliberate):
 *   • Same tokens, same walk, same classification for every variant — rename a variant
 *     and its numbers do not move. No expected values live anywhere in this code.
 *   • The footprint is re-measurable at any commit (it does not depend on git history —
 *     the Overfit implementation predates the lab's metric pipeline and has no isolated
 *     baseline commit, so a diff-based measure would be impossible for it; the footprint
 *     measures all three variants with one honest method).
 *   • Hand-written files only in the scored counts. Generated mirrors (OpenAPI, generated
 *     TS clients) are counted separately as context: regenerating is cheap, hand-kept
 *     copies are the real cost.
 *   • If a variant does not carry the feature at all, the experiment is `unavailable`
 *     for it — an empty footprint must never score 100.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'
import { classify } from '../lib/fsutil.mjs'
import { buildProjectGraph } from '../lib/projectgraph.mjs'
import { ok, unavailable } from '../lib/metric.mjs'

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'dist-types',
  '.output',
  '.next',
  'target',
  'coverage',
  '.turbo',
  '.nx',
  '.vite',
  '.cache'
])

const TEXT_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.rs', '.md', '.mdx', '.json', '.yaml', '.yml', '.toml', '.css'])

/** Walk that KEEPS generated directories (classify() buckets them) but skips build output. */
function walkAll(root) {
  const out = []
  if (!existsSync(root)) return out
  const stack = [root]
  while (stack.length) {
    const dir = stack.pop()
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const e of entries) {
      const full = join(dir, e.name)
      if (e.isDirectory()) {
        if (!IGNORED_DIRS.has(e.name) && !e.name.startsWith('.')) stack.push(full)
      } else if (e.isFile()) {
        out.push(full)
      }
    }
  }
  return out
}

export function collectChangeExperiment(variant, repoRoot, experiment, projects) {
  const keys = [
    'change.footprint.sourceFiles',
    'change.footprint.testSupport',
    'change.footprint.docs',
    'change.footprint.projects',
    'change.footprint.files',
    'change.footprint.generated'
  ]
  if (!experiment?.tokens?.length) {
    const reason = 'No changeExperiment descriptor in variants.config.json.'
    return Object.fromEntries(keys.map((k) => [k, unavailable(reason)]))
  }
  const tokenRe = new RegExp(experiment.tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'))

  const roots = [...(variant.roots ?? []), ...(variant.docsRoots ?? []), ...(variant.generatedRoots ?? [])]
  const buckets = { source: [], tests: [], docs: [], generated: [], config: [] }
  for (const root of roots) {
    for (const file of walkAll(join(repoRoot, root))) {
      if (!TEXT_EXTS.has(extname(file).toLowerCase())) continue
      let text
      try {
        text = readFileSync(file, 'utf8')
      } catch {
        continue
      }
      if (!tokenRe.test(text)) continue
      const c = classify(file, repoRoot)
      if (c.isGenerated || (variant.generatedRoots ?? []).some((g) => c.rel.startsWith(g))) buckets.generated.push(c.rel)
      else if (c.isDoc) buckets.docs.push(c.rel)
      else if (c.isTest) buckets.tests.push(c.rel)
      else if (c.isCode) buckets.source.push(c.rel)
      else buckets.config.push(c.rel)
    }
  }

  // The experiment only applies once the variant actually carries the feature: an empty
  // footprint means "not implemented", never "zero-cost change".
  if (buckets.source.length === 0) {
    const reason = `Feature "${experiment.id}" not detected under this variant's roots — experiment not applicable yet.`
    return Object.fromEntries(keys.map((k) => [k, unavailable(reason)]))
  }

  // Distinct workspace projects (npm packages + cargo crates) the footprint spans —
  // the coordination surface of the change. Deepest project dir wins per file.
  const dirs = [...projects.values()].map((p) => p.dir).sort((a, b) => b.length - a.length)
  const touched = new Set()
  for (const rel of [...buckets.source, ...buckets.tests]) {
    const project = dirs.find((d) => rel.startsWith(`${d}/`))
    if (project) touched.add(project)
  }

  // Test-support surface (CONTEXT, not scored, deliberately NON-exclusive): dedicated test
  // files PLUS source files that embed inline Rust test modules (`#[cfg(test)]`). Rust
  // idiomatically tests inside `lib.rs`, so an exclusive source-XOR-test classification
  // would silently move Rust test cost into the source bucket while TS variants keep
  // separate test files — a language-idiom bias, which is why this number is context only.
  const inlineTestFiles = buckets.source.filter((rel) => {
    if (!rel.endsWith('.rs')) return false
    try {
      return readFileSync(join(repoRoot, rel), 'utf8').includes('#[cfg(test)]')
    } catch {
      return false
    }
  })
  const testSupport = [...buckets.tests, ...inlineTestFiles]

  const at = experiment.id
  const handWritten = buckets.source.length + buckets.tests.length + buckets.docs.length + buckets.config.length
  const detail = (files) => ({ experiment: at, files: files.slice().sort() })
  return {
    'change.footprint.sourceFiles': ok(buckets.source.length, detail(buckets.source)),
    'change.footprint.testSupport': ok(testSupport.length, {
      ...detail(testSupport),
      note: 'NON-exclusive: dedicated test files + source files with inline #[cfg(test)] modules. Context only — overlaps sourceFiles by design.'
    }),
    'change.footprint.docs': ok(buckets.docs.length, detail(buckets.docs)),
    'change.footprint.projects': ok(touched.size, { experiment: at, projects: [...touched].sort() }),
    'change.footprint.files': ok(handWritten, {
      experiment: at,
      note: 'hand-written files carrying the capability (source + dedicated tests + docs + config); generated mirrors counted separately'
    }),
    'change.footprint.generated': ok(buckets.generated.length, detail(buckets.generated))
  }
}
