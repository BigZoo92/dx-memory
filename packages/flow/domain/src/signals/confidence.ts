import type { Signal } from '@signalops/contracts'

/**
 * Confidence band. The contract stores confidence as `number | null` in [0, 1]; the product
 * surfaces it as a Low/Medium/High label (and an "Unavailable" state when `null`). This is
 * the one place that mapping lives, so the table cell, the detail tile and the compare row
 * never disagree.
 */
export type ConfidenceBand = 'low' | 'medium' | 'high' | 'unavailable'

export type NormalizedConfidence = {
  band: ConfidenceBand
  /** Display label: "Low" | "Medium" | "High" | "Unavailable". */
  label: string
  available: boolean
  /** Percentage in [0, 100] for the progress bar; 0 when unavailable. */
  percent: number
}

const HIGH_THRESHOLD = 0.66
const MEDIUM_THRESHOLD = 0.33

/**
 * Normalize a raw confidence value into a band + display label + percentage.
 * `null` (≈5% of fixtures) maps to the "Unavailable" state — the function never throws.
 */
export function normalizeConfidence(confidence: number | null): NormalizedConfidence {
  if (confidence === null || Number.isNaN(confidence)) {
    return { band: 'unavailable', label: 'Unavailable', available: false, percent: 0 }
  }
  const clamped = Math.min(1, Math.max(0, confidence))
  const percent = Math.round(clamped * 100)
  if (clamped >= HIGH_THRESHOLD) return { band: 'high', label: 'High', available: true, percent }
  if (clamped >= MEDIUM_THRESHOLD)
    return { band: 'medium', label: 'Medium', available: true, percent }
  return { band: 'low', label: 'Low', available: true, percent }
}

/** Convenience: the display label for a signal's confidence ("Unavailable" when missing). */
export function confidenceLabel(signal: Pick<Signal, 'confidence'>): string {
  return normalizeConfidence(signal.confidence).label
}
