/**
 * Runtime UX metrics parsed from real Lighthouse reports in .lighthouseci/. Reports are
 * attributed to a variant via its `lighthouseUrlHint` (the URL Lighthouse audited). We use
 * the most recent matching run. Variants without a matching report degrade to `unavailable`
 * — this is exactly the seam where post-deploy audits get wired in a later pass.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { ok, unavailable, round, bytesToKb } from '../lib/metric.mjs'

const LH_DIR = '.lighthouseci'
/** ~0.5 g CO₂ per MB transferred (Sustainable Web Design order-of-magnitude estimate). */
const CO2_MG_PER_KB = 500 / 1024

function num(lhr, id) {
  const v = lhr?.audits?.[id]?.numericValue
  return typeof v === 'number' ? v : null
}

export function collectLighthouse(variant, repoRoot) {
  const hint = variant.lighthouseUrlHint
  const unavailAll = (reason) => ({
    lighthousePerformance: unavailable(reason),
    lighthouseAccessibility: unavailable(reason),
    lighthouseBestPractices: unavailable(reason),
    lcpMs: unavailable(reason),
    cls: unavailable(reason),
    tbtMs: unavailable(reason),
    speedIndexMs: unavailable(reason),
    fcpMs: unavailable(reason),
    requests: unavailable(reason),
    transferredKb: unavailable(reason),
    co2PerViewMg: unavailable(reason)
  })

  const dir = join(repoRoot, LH_DIR)
  if (!hint) return unavailAll('No deployed/served URL configured for this variant yet.')
  if (!existsSync(dir)) return unavailAll('No .lighthouseci reports present — run the Lighthouse audit.')

  const candidates = readdirSync(dir)
    .filter((f) => /^lhr-.*\.json$/.test(f))
    .map((f) => {
      const full = join(dir, f)
      let lhr
      try {
        lhr = JSON.parse(readFileSync(full, 'utf8'))
      } catch {
        return null
      }
      const url = lhr.finalDisplayedUrl || lhr.finalUrl || lhr.requestedUrl || ''
      return { full, mtime: statSync(full).mtimeMs, lhr, url }
    })
    .filter((c) => c && c.url.includes(hint))
    .sort((a, b) => b.mtime - a.mtime)

  if (candidates.length === 0)
    return unavailAll(`No Lighthouse report matched "${hint}".`)

  const lhr = candidates[0].lhr
  const cat = (id) => {
    const s = lhr?.categories?.[id]?.score
    return typeof s === 'number' ? round(s * 100, 0) : null
  }
  const transferredBytes = num(lhr, 'total-byte-weight')
  const requests = lhr?.audits?.['network-requests']?.details?.items?.length ?? null
  const transferredKb = transferredBytes != null ? bytesToKb(transferredBytes) : null

  const wrap = (v, r = 0) => (v == null ? unavailable('Audit missing from report.') : ok(round(v, r)))

  return {
    lighthousePerformance: wrap(cat('performance')),
    lighthouseAccessibility: wrap(cat('accessibility')),
    lighthouseBestPractices: wrap(cat('best-practices')),
    lcpMs: wrap(num(lhr, 'largest-contentful-paint')),
    cls: wrap(num(lhr, 'cumulative-layout-shift'), 3),
    tbtMs: wrap(num(lhr, 'total-blocking-time')),
    speedIndexMs: wrap(num(lhr, 'speed-index')),
    fcpMs: wrap(num(lhr, 'first-contentful-paint')),
    requests: requests == null ? unavailable('Audit missing from report.') : ok(requests),
    transferredKb: transferredKb == null ? unavailable('Audit missing.') : ok(transferredKb),
    co2PerViewMg:
      transferredKb == null
        ? unavailable('Needs transferred weight.')
        : ok(round(transferredKb * CO2_MG_PER_KB, 1))
  }
}
