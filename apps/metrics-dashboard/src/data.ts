import raw from '@metrics'
import type { Summary, VariantId, VariantSummary } from './types'

export const summary = raw as unknown as Summary

/** Canonical variant order used everywhere (matches the design narrative). */
export const VARIANT_ORDER: VariantId[] = ['flow', 'friction', 'overfit']

export const variants: VariantSummary[] = VARIANT_ORDER.map(
  (id) => summary.variants.find((v) => v.meta.variant === id)!
).filter(Boolean)

export function variant(id: VariantId): VariantSummary {
  return variants.find((v) => v.meta.variant === id)!
}

export const AXES = ['Build', 'Ship', 'Run', 'Change'] as const
export type Axis = (typeof AXES)[number]

const scoredAxisGroups = Object.entries(summary.scoreGroups ?? {}).filter(
  ([name, group]) => !name.startsWith('$') && group?.kind === 'axis' && group.members
)

type PublishedVerdictIssue = {
  variant: VariantId
  axis: string
  key: string
  reason: string
}

export const publishedVerdictIssues: PublishedVerdictIssue[] = variants.flatMap((variantSummary) => {
  const id = variantSummary.meta.variant
  const issues: PublishedVerdictIssue[] = []
  for (const [axis, group] of scoredAxisGroups) {
    for (const key of Object.keys(group.members)) {
      const metric = variantSummary.metrics[key]
      if (metric?.status !== 'ok') {
        issues.push({ variant: id, axis, key, reason: metric?.reason ?? 'not collected' })
      }
    }
  }
  for (const [axis] of scoredAxisGroups) {
    const score = variantSummary.scores[axis]
    if (score?.gated || score?.value == null || score?.complete === false) {
      issues.push({ variant: id, axis, key: axis, reason: 'axis score incomplete or gated' })
    }
  }
  return issues
})

export const publishedVerdictFinal =
  summary.provenance?.source === 'ci' && publishedVerdictIssues.length === 0

/* ------------------------------------------------- GitHub delivery pipeline ---- */
export const githubSource = summary.sources?.github
export const github = summary.github
export const githubMetrics = summary.githubMetrics ?? {}
export const history = summary.history ?? []

/** True when the GitHub collector actually returned data this run. */
export const githubOk = githubSource?.status === 'ok' && !!github

/**
 * Signal confidence for the GitHub section: how much of the pipeline we could actually
 * observe. Drives the "signal confidence" badge — honest about partial data.
 */
export function githubConfidence(): { level: 'high' | 'medium' | 'low' | 'none'; label: string; detail: string } {
  if (!githubOk || !github) return { level: 'none', label: 'No signal', detail: githubSource?.reason ?? 'GitHub API not queried.' }
  const runs = github.runsSummary?.completedCount ?? 0
  const jobs = github.jobs?.queriedRuns ?? 0
  if (runs >= 10 && jobs >= 8) return { level: 'high', label: 'High confidence', detail: `${runs} completed runs · jobs from ${jobs} runs` }
  if (runs >= 4) return { level: 'medium', label: 'Medium confidence', detail: `${runs} completed runs · jobs from ${jobs} runs` }
  return { level: 'low', label: 'Low confidence', detail: `${runs} completed runs sampled` }
}
