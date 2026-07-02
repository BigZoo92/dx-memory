/**
 * Static architecture & code-quality metrics — the heart of the collector and 100 %
 * measurable offline. Everything here is derived by walking the variant's source roots
 * and applying documented heuristics. No numbers are invented.
 *
 * Complexity note: cyclomatic complexity is approximated by counting decision points
 * (if/for/while/case/catch/&&/||/?/?? and Rust match arms) per function-like block. This
 * is a comparison heuristic, not a compiler metric — but it is applied identically to all
 * three variants, so the *relative* signal is fair.
 */
import { walk, classify, countLines, safeRead } from '../lib/fsutil.mjs'
import { ok, round } from '../lib/metric.mjs'

const DECISION_RE = /\b(if|for|while|case|catch)\b|&&|\|\||\?\?|\?[^.:]|=>\s*{/g
const FN_SPLIT_RE = /\bfunction\b|=>|\bfn\s+\w+|\bimpl\b/g
const TODO_RE = /\b(TODO|FIXME|HACK|XXX)\b/g
const ANY_RE = /(:\s*any\b|<any>|\bas\s+any\b|\bany\[\])/g
const AS_UNKNOWN_RE = /\bas\s+unknown\s+as\b/g
const DISABLE_RE = /(eslint-disable|oxlint-disable|@ts-ignore|@ts-expect-error|#\[allow\()/g

function countMatches(text, re) {
  const m = text.match(re)
  return m ? m.length : 0
}

/**
 * Approximate per-function cyclomatic complexity for a file. We split the file into
 * function-ish segments and count decision points + 1 in each.
 */
function fileComplexities(text) {
  // crude segmentation: split on function boundaries, keep the segment that follows
  const parts = text.split(FN_SPLIT_RE)
  if (parts.length <= 1) {
    // whole-file fallback (module-level script)
    return [1 + countMatches(text, DECISION_RE)]
  }
  return parts.slice(1).map((seg) => 1 + countMatches(seg, DECISION_RE))
}

export function collectArchitecture(variant, repoRoot, { fileSizeThreshold = 300, complexityThreshold = 10 } = {}) {
  let sourceFiles = 0
  let configFiles = 0
  let locTotal = 0
  let locFrontend = 0
  let locBackend = 0
  let locTests = 0
  let locDocs = 0
  let todoCount = 0
  let anyCount = 0
  let asUnknownAsCount = 0
  let lintDisableCount = 0
  let filesOverSize = 0
  let businessLoc = 0
  let boilerplateLoc = 0

  const complexities = []

  for (const root of variant.roots) {
    const abs = `${repoRoot}/${root}`
    for (const file of walk(abs)) {
      const c = classify(file, repoRoot)
      const lines = countLines(file)

      if (c.isDoc) {
        locDocs += lines
        continue
      }
      if (c.isConfig) {
        configFiles++
        boilerplateLoc += lines
        continue
      }
      if (c.isTest) {
        locTests += lines
        continue
      }
      if (!c.isSource) continue

      // real source file
      sourceFiles++
      locTotal += lines
      if (c.isBackend) locBackend += lines
      else locFrontend += lines
      if (lines > fileSizeThreshold) filesOverSize++

      if (c.isBarrel || c.isGenerated) boilerplateLoc += lines
      else businessLoc += lines

      const text = safeRead(file)
      todoCount += countMatches(text, TODO_RE)
      lintDisableCount += countMatches(text, DISABLE_RE)
      // `any` / `as unknown as` only meaningful in TS
      if (c.ext === '.ts' || c.ext === '.tsx') {
        anyCount += countMatches(text, ANY_RE)
        asUnknownAsCount += countMatches(text, AS_UNKNOWN_RE)
      }
      for (const cx of fileComplexities(text)) complexities.push(cx)
    }
  }

  const avgComplexity =
    complexities.length > 0 ? complexities.reduce((a, b) => a + b, 0) / complexities.length : 0
  const maxComplexity = complexities.length > 0 ? Math.max(...complexities) : 0
  const fnsOverComplexity = complexities.filter((c) => c > complexityThreshold).length
  const denom = businessLoc + boilerplateLoc
  const businessRatio = denom > 0 ? businessLoc / denom : 0

  return {
    sourceFiles: ok(sourceFiles),
    configFiles: ok(configFiles),
    locTotal: ok(locTotal),
    locFrontend: ok(locFrontend),
    locBackend: ok(locBackend),
    locTests: ok(locTests),
    locDocs: ok(locDocs),
    todoCount: ok(todoCount),
    anyCount: ok(anyCount),
    asUnknownAsCount: ok(asUnknownAsCount),
    lintDisableCount: ok(lintDisableCount),
    avgComplexity: ok(round(avgComplexity, 2)),
    maxComplexity: ok(maxComplexity),
    fnsOverComplexity: ok(fnsOverComplexity),
    filesOverSize: ok(filesOverSize),
    businessRatio: ok(round(businessRatio, 3))
  }
}
