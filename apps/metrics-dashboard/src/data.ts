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
