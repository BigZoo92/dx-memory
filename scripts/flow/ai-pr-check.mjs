// pnpm flow:ai-pr-check — governance checks for AI-assisted changes on the Flow variant.
//
// Blocking at this stage (hard fails): secrets, cross-variant changes, architecture boundaries.
// Warnings (surface but do not fail): protected-path edits, dependency changes, docs drift, risky TODOs.
// Rationale: start strict only where the cost of a mistake is high; tighten the rest over time.
import { existsSync, readFileSync, statSync } from 'node:fs'
import { section, ok, warn, fail, info, capture, runQuiet } from './lib/sh.mjs'

function changedFiles() {
  // In CI, diff against the base ref (nx-set-shas exports NX_BASE/NX_HEAD). Locally, fall back to the
  // working-tree diff vs HEAD plus untracked files.
  const base = process.env.AI_PR_BASE || process.env.NX_BASE
  const head = process.env.NX_HEAD || 'HEAD'
  let tracked = ''
  if (base) {
    tracked = capture(`git diff --name-only ${base} ${head}`) || capture(`git diff --name-only ${base}...${head}`)
  } else {
    tracked = capture('git diff --name-only HEAD')
  }
  const untracked = capture('git ls-files --others --exclude-standard')
  return [...new Set([...tracked.split('\n'), ...untracked.split('\n')].map((f) => f.trim()).filter(Boolean))]
}

const SECRET_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /AKIA[0-9A-Z]{16}/,
  /\b(secret|token|api[_-]?key|password|passwd)\b\s*[:=]\s*['"][^'"\s]{8,}['"]/i,
  /\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}/ // JWT
]
const SKIP = /(pnpm-lock\.yaml|\.gen\.ts$|\.(png|jpg|jpeg|ico|svg|woff2?|map)$|(^|\/)node_modules\/)/

function readSafe(file) {
  try {
    if (!existsSync(file) || statSync(file).size > 800_000) return null
    return readFileSync(file, 'utf8')
  } catch {
    return null
  }
}

const files = changedFiles()
let blocking = 0

section('AI PR check — Flow governance')
if (files.length === 0) {
  ok('no changes detected')
  process.exit(0)
}
info(`${files.length} changed file(s)`)

// 1. Secret scan (BLOCKING)
section('Secrets (blocking)')
let secretHits = 0
for (const file of files) {
  if (SKIP.test(file)) continue
  const content = readSafe(file)
  if (!content) continue
  for (const re of SECRET_PATTERNS) {
    if (re.test(content)) {
      fail(`possible secret in ${file}  (/${re.source.slice(0, 40)}.../)`)
      secretHits += 1
      blocking += 1
    }
  }
}
if (secretHits === 0) ok('no secrets detected')

// 2. Cross-variant + boundaries (BLOCKING)
section('Cross-variant & boundaries (blocking)')
const crossVariant = files.filter((f) => /^(apps|packages)\/(friction|overfit)\b/.test(f))
if (crossVariant.length > 0) {
  for (const f of crossVariant) fail(`change touches another variant: ${f}`)
  blocking += crossVariant.length
} else {
  ok('no cross-variant file changes')
}
if (runQuiet('pnpm audit:flow:boundaries')) ok('architecture boundaries pass')
else {
  fail('architecture boundaries failed (run `pnpm audit:flow:boundaries`)')
  blocking += 1
}

// 3. Protected paths (WARNING)
section('Protected paths (warning)')
const protectedHits = files.filter((f) =>
  /^(docs\/product|maquettes|packages\/metrics|packages\/contracts)\//.test(f)
)
if (protectedHits.length > 0) protectedHits.forEach((f) => warn(`protected path modified — justify: ${f}`))
else ok('no protected paths modified')

// 4. Dependencies (WARNING)
section('Dependencies (warning)')
const depFiles = files.filter((f) => f.endsWith('package.json') || f === 'pnpm-lock.yaml')
if (depFiles.length > 0) depFiles.forEach((f) => warn(`dependency manifest changed — justify new deps: ${f}`))
else ok('no dependency changes')

// 5. Docs drift + risky markers (WARNING)
section('Docs & markers (warning)')
const touchesArch = files.some(
  (f) => /^packages\/flow\/[^/]+\/(package\.json|tsconfig\.json)$/.test(f) || f === '.dependency-cruiser.cjs'
)
const touchesDocs = files.some((f) => f.startsWith('docs/'))
if (touchesArch && !touchesDocs) warn('architecture/config changed but no docs updated — add a decision note')
else ok('docs check')
let todos = 0
for (const file of files) {
  if (SKIP.test(file)) continue
  const content = readSafe(file)
  if (content && /TODO\s*:?\s*(remove|hack|fixme|danger)/i.test(content)) {
    warn(`risky TODO marker in ${file}`)
    todos += 1
  }
}
if (todos === 0) ok('no risky TODO markers')

console.log('')
if (blocking > 0) {
  fail(`AI PR check FAILED — ${blocking} blocking issue(s)`)
  process.exit(1)
}
ok('AI PR check passed (blocking checks clean; warnings are advisory)')
