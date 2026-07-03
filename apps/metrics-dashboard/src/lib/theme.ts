import type { VariantId } from '../types'

/**
 * Validated categorical palette (dataviz skill validator, dark surface):
 * lightness band ✓, chroma ✓, contrast ✓, worst-adjacent CVD ΔE 29.2 (≫ 12 target).
 * `mark` = data marks (validated). `glow` = lighter tint for decorative accents/labels only.
 */
export const VARIANT_COLOR: Record<VariantId, { mark: string; glow: string; soft: string }> = {
  flow: { mark: '#0fa886', glow: '#2ee6bf', soft: 'rgba(46,230,191,0.14)' },
  friction: { mark: '#ee5636', glow: '#ff7a5c', soft: 'rgba(255,122,92,0.14)' },
  overfit: { mark: '#8c63ec', glow: '#b79bff', soft: 'rgba(183,155,255,0.14)' }
}

export const VARIANT_LABEL: Record<VariantId, string> = {
  flow: 'Flow',
  friction: 'Friction',
  overfit: 'Overfit'
}

/** Reserved status ramp (never reused for a series). */
export const STATUS = {
  good: '#2fbf71',
  warning: '#e8b339',
  serious: '#ef7d3b',
  critical: '#e5484d',
  muted: 'rgba(255,255,255,0.28)'
}

/** Map a 0–100 score to a status color (for score chips / meters). */
export function scoreColor(v: number | null): string {
  if (v == null) return STATUS.muted
  if (v >= 75) return STATUS.good
  if (v >= 55) return STATUS.warning
  if (v >= 40) return STATUS.serious
  return STATUS.critical
}

/** Color a GitHub Actions run/job conclusion (shared by timeline + heatmap). */
export function conclusionColor(conclusion: string | null | undefined): string {
  switch (conclusion) {
    case 'success':
      return STATUS.good
    case 'failure':
      return STATUS.critical
    case 'cancelled':
      return STATUS.serious
    case 'skipped':
      return STATUS.muted
    case null:
    case undefined:
      return STATUS.warning // in-progress / no conclusion yet
    default:
      return STATUS.warning
  }
}

export const INK = {
  primary: 'rgba(255,255,255,0.92)',
  secondary: 'rgba(255,255,255,0.64)',
  muted: 'rgba(255,255,255,0.42)',
  faint: 'rgba(255,255,255,0.28)',
  hair: 'rgba(255,255,255,0.10)'
}
