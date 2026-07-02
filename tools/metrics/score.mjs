/**
 * Transparent scoring engine.
 *
 * 1. Normalize each metric to 0–100 across the three variants (min-max), oriented by the
 *    catalog's `direction` so 100 always means "best of the three".
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

/** direction-aware normalization → 0..100 (100 = best). */
function makeNormalizer(values, direction, band) {
  if (direction === 'balance') return (v) => balanceScore(v, band)
  const nums = values.filter((v) => typeof v === 'number' && !Number.isNaN(v))
  const min = Math.min(...nums)
  const max = Math.max(...nums)
  const span = max - min
  return (v) => {
    if (typeof v !== 'number' || Number.isNaN(v)) return null
    if (span === 0) return 100 // all equal → all best
    const t = (v - min) / span
    return Math.round((direction === 'higher' ? t : 1 - t) * 1000) / 10
  }
}

/** Read a metric value for a variant, or null if not ok. */
function metricValue(variant, key) {
  const m = variant.metricsFlat[key]
  return m && m.status === 'ok' && typeof m.value === 'number' ? m.value : null
}

export function scoreAll(config, variants) {
  const catalog = config.metrics
  const normalizers = {}
  const normScores = {} // key -> variantId -> 0..100

  // build a normalizer per metric key from the three variant values
  for (const key of Object.keys(catalog)) {
    const dir = catalog[key].direction
    if (dir === 'neutral') continue
    const values = variants.map((v) => metricValue(v, key))
    const nz = makeNormalizer(values, dir, config.balanceBands?.[key])
    normalizers[key] = nz
    normScores[key] = {}
    for (const v of variants) normScores[key][v.id] = nz(metricValue(v, key))
  }

  const groups = config.scoreGroups
  const axisWeights = config.axisWeights
  const coverageMin = config.axisCoverageMin ?? 0

  const perVariantScores = {}
  for (const v of variants) {
    const scores = {}
    for (const [gName, g] of Object.entries(groups)) {
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

  // per-metric winners
  const winners = {}
  for (const key of Object.keys(catalog)) {
    if (catalog[key].direction === 'neutral') continue
    let best = null
    let bestScore = -1
    for (const v of variants) {
      const ns = normScores[key]?.[v.id]
      if (ns != null && ns > bestScore) {
        bestScore = ns
        best = v.id
      }
    }
    if (best) winners[key] = best
  }

  return { perVariantScores, normScores, winners }
}
