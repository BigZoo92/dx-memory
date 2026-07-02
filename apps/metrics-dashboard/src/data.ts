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
