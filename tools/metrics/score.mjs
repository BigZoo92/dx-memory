/**
 * Transparent scoring engine.
 *
 * 1. Normalize each metric to 0–100 across the three variants with a RATIO-TO-BEST rule,
 *    oriented by the catalog's `direction` so 100 always means "best of the three":
 *      lower-is-better  → score = 100 × best ÷ value      ("the cheapest sets the bar;
 *                                                           you score the bar over your cost")
 *      higher-is-better → score = 100 × value ÷ best
 *    Counts (and any metric whose best is 0) are Laplace-smoothed with +1 so a zero best
 *    never divides by zero and one extra unit never zeroes a score. Unlike min-max, this
 *    keeps scores PROPORTIONAL: with only three data points, min-max forced the worst
 *    variant to 0 and made a 5% gap look identical to a 5× gap.
 * 2. Each score group = weighted average of its members' normalized scores. Members that are
 *    `unavailable`/`error` are dropped and the remaining weights are renormalized — partial
 *    data yields a partial (but honest) score, flagged with `coverage`.
 * 3. The 4 axes (Build/Ship/Run/Change) roll up into the headline Total Delivery Score with
 *    `axisWeights`. Every intermediate number is kept so the dashboard can show the maths.
 */

/** "balance" normalization: 100 inside [idealMin,idealMax], linear falloff to 0 at hard bounds. */
function balanceScore(v, band) {
  if (typeof v !== 'number' || Number.isNaN(v) || !band) return null
  if (v >= band.idealMin && v <= band.idealMax) return 100
  if (v < band.idealMin) {
    const t = (v - band.hardMin) / (band.idealMin - band.hardMin)
    return Math.round(Math.max(0, Math.min(1, t)) * 1000) / 10
  }
  const t = (band.hardMax - v) / (band.hardMax - band.idealMax)
  return Math.round(Math.max(0, Math.min(1, t)) * 1000) / 10
}

/** direction-aware normalization → 0..100 (100 = best). Ratio-to-best (see header). */
function makeNormalizer(values, direction, band, unit) {
  if (direction === 'balance') return (v) => balanceScore(v, band)
  const nums = values.filter((v) => typeof v === 'number' && !Number.isNaN(v))
  if (nums.length === 0) return () => null
  const best = direction === 'higher' ? Math.max(...nums) : Math.min(...nums)
  // +1 Laplace smoothing for discrete counts and whenever the best is 0: a variant with
  // 0 of a bad thing stays at 100 and the others degrade proportionally instead of to 0.
  const smooth = unit === 'count' || best === 0 ? 1 : 0
  return (v) => {
    if (typeof v !== 'number' || Number.isNaN(v)) return null
    const ratio =
      direction === 'higher' ? (v + smooth) / (best + smooth) : (best + smooth) / (v + smooth)
    return Math.round(Math.min(1, Math.max(0, ratio)) * 1000) / 10
  }
}

/** Read a metric value for a variant, or null if not ok. */
function metricValue(variant, key) {
  const m = variant.metricsFlat[key]
  return m && m.status === 'ok' && typeof m.value === 'number' ? m.value : null
}

/**
 * Repo-level metrics (catalog `scope:'repo'`, e.g. the shared GitHub Actions pipeline) are
 * identical for every variant. They are read from `repoMetrics` and applied to all three, so
 * they tie at 100 during min-max normalization: they enrich an axis with the real delivery
 * chain without ever faking per-variant differentiation.
 */
function readValue(variant, key, catalog, repoMetrics) {
  if (catalog[key]?.scope === 'repo') {
    const m = repoMetrics[key]
    return m && m.status === 'ok' && typeof m.value === 'number' ? m.value : null
  }
  return metricValue(variant, key)
}

export function scoreAll(config, variants, repoMetrics = {}) {
  const catalog = config.metrics
  const normalizers = {}
  const normScores = {} // key -> variantId -> 0..100

  // build a normalizer per metric key from the three variant values
  for (const key of Object.keys(catalog)) {
    const dir = catalog[key].direction
    if (dir === 'neutral') continue
    const values = variants.map((v) => readValue(v, key, catalog, repoMetrics))
    const nz = makeNormalizer(values, dir, config.balanceBands?.[key], catalog[key].unit)
    normalizers[key] = nz
    normScores[key] = {}
    for (const v of variants) normScores[key][v.id] = nz(readValue(v, key, catalog, repoMetrics))
  }

  const groups = config.scoreGroups
  const axisWeights = config.axisWeights
  const coverageMin = config.axisCoverageMin ?? 0

  const perVariantScores = {}
  for (const v of variants) {
    const scores = {}
    for (const [gName, g] of Object.entries(groups)) {
      if (gName.startsWith('$') || !g || typeof g !== 'object' || !g.members) continue
      let acc = 0
      let wSum = 0
      let totalW = 0
      let have = 0
      let total = 0
      for (const [key, w] of Object.entries(g.members)) {
        total++
        totalW += w
        const ns = normScores[key]?.[v.id]
        if (ns == null) continue
        acc += ns * w
        wSum += w
        have++
      }
      const coverageFrac = totalW > 0 ? wSum / totalW : 0
      // axis groups need enough covered weight to be trustworthy; otherwise report as
      // partial with a null value so a weak single-proxy axis never scores as 0.
      const gated = g.kind === 'axis' && coverageFrac < coverageMin
      scores[gName] = {
        label: g.label,
        kind: g.kind,
        value: !gated && wSum > 0 ? Math.round((acc / wSum) * 10) / 10 : null,
        coverage: `${have}/${total}`,
        coverageFrac: Math.round(coverageFrac * 100) / 100,
        complete: have === total,
        gated
      }
    }
    // headline: weighted mean over the delivery axes that are actually measured for this
    // variant (gated/null axes excluded, remaining weights renormalized). Change dominates.
    let hAcc = 0
    let hW = 0
    for (const [axis, w] of Object.entries(axisWeights)) {
      if (axis.startsWith('$')) continue
      const s = scores[axis.toLowerCase()]?.value
      if (s == null) continue
      hAcc += s * w
      hW += w
    }
    scores.totalDeliveryScore = {
      label: 'Total Delivery Score',
      kind: 'headline',
      value: hW > 0 ? Math.round((hAcc / hW) * 10) / 10 : null,
      method: 'weighted-mean-over-measured-axes',
      axesUsed: Object.keys(axisWeights)
        .filter((k) => !k.startsWith('$') && scores[k.toLowerCase()]?.value != null)
        .map((k) => k)
    }
    perVariantScores[v.id] = scores
  }

  // per-metric winners (repo-level metrics tie across variants — never crown a "winner",
  // and an exact tie at the top crowns no one either)
  const winners = {}
  for (const key of Object.keys(catalog)) {
    if (catalog[key].direction === 'neutral' || catalog[key].scope === 'repo') continue
    let best = null
    let bestScore = -1
    let tied = false
    for (const v of variants) {
      const ns = normScores[key]?.[v.id]
      if (ns == null) continue
      if (ns > bestScore) {
        bestScore = ns
        best = v.id
        tied = false
      } else if (ns === bestScore) {
        tied = true
      }
    }
    if (best && !tied) winners[key] = best
  }

  return { perVariantScores, normScores, winners }
}
