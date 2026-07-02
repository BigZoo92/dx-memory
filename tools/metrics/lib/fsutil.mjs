/**
 * Filesystem helpers for the metrics collector.
 *
 * We walk the tree directly (no `git ls-files`) so the collector runs anywhere, and we
 * classify every file into source / test / config / docs and front-end / back-end using
 * cheap, documented heuristics. The classification is deliberately simple and stable —
 * it is a comparison tool between variants, not a compiler.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, extname, basename, relative } from 'node:path'

/** Directories we never descend into — build output, deps, caches, generated code. */
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
  'generated',
  'contracts-generated',
  'generated-manifests',
  '.vite',
  '.cache'
])

const SOURCE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.rs', '.css', '.scss'])
const CODE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.rs'])
const CONFIG_EXTS = new Set(['.json', '.yaml', '.yml', '.toml'])
const DOC_EXTS = new Set(['.md', '.mdx'])
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif', '.ico'])
const FONT_EXTS = new Set(['.woff', '.woff2', '.ttf', '.otf', '.eot'])

const CONFIG_NAME_RE = /(^\.|\.config\.|rc\.|\.rc$|tsconfig|vite\.|vitest\.|\.lintrc|dockerfile)/i
const TEST_RE = /(\.test\.|\.spec\.|__tests__|(^|\/)tests?\/|_test\.rs$|\.stories\.)/i
const GENERATED_RE = /(routeTree\.gen|\.gen\.|generated|contracts-generated)/i
const BACKEND_RE = /(\/api\/|-api\/|\/server|server-data-access|\/crates\/|observability|repositories|event-store|read-models|application\/|queries\/|commands\/|policies\/|\/domain\/)/i
const BARREL_RE = /(^|\/)index\.(ts|tsx|js)$/i

/** Recursively collect every file path under `root`. */
export function walk(root) {
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
      if (e.name.startsWith('.') && e.name !== '.oxlintrc.json') {
        // still skip dotfiles from source counting but allow dot-config detection below
      }
      const full = join(dir, e.name)
      if (e.isDirectory()) {
        if (IGNORED_DIRS.has(e.name)) continue
        stack.push(full)
      } else if (e.isFile()) {
        out.push(full)
      }
    }
  }
  return out
}

/** Classify a file relative to the repo root. */
export function classify(absPath, repoRoot) {
  const rel = relative(repoRoot, absPath)
  const ext = extname(absPath).toLowerCase()
  const name = basename(absPath)

  const isDoc = DOC_EXTS.has(ext)
  const isImage = IMAGE_EXTS.has(ext)
  const isFont = FONT_EXTS.has(ext)
  const isTest = TEST_RE.test(rel)
  const isGenerated = GENERATED_RE.test(rel)
  const isConfig = !isDoc && (CONFIG_EXTS.has(ext) || CONFIG_NAME_RE.test(name))
  const isCode = CODE_EXTS.has(ext)
  const isSource = !isTest && !isGenerated && isCode
  const isBackend = BACKEND_RE.test(rel) || ext === '.rs'
  const isBarrel = BARREL_RE.test(rel)

  return {
    rel,
    ext,
    name,
    isDoc,
    isImage,
    isFont,
    isTest,
    isGenerated,
    isConfig,
    isCode,
    isSource,
    isBackend,
    isBarrel
  }
}

/** Count non-empty lines of a text file. */
export function countLines(absPath) {
  try {
    const text = readFileSync(absPath, 'utf8')
    let count = 0
    let empty = false
    let start = 0
    for (let i = 0; i <= text.length; i++) {
      if (i === text.length || text[i] === '\n') {
        empty = text.slice(start, i).trim().length === 0
        if (!empty) count++
        start = i + 1
      }
    }
    return count
  } catch {
    return 0
  }
}

export function safeRead(absPath) {
  try {
    return readFileSync(absPath, 'utf8')
  } catch {
    return ''
  }
}

export function fileSize(absPath) {
  try {
    return statSync(absPath).size
  } catch {
    return 0
  }
}

export { IMAGE_EXTS, FONT_EXTS, CODE_EXTS }
