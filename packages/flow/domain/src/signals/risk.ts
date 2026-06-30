/**
 * Risk score banding. Thresholds are transcribed from the reference (`maquettes/SignalOps.dc.html`):
 * ≥85 critical, ≥70 high, ≥50 medium, else low. The UI maps these bands to colors; the band
 * itself is domain logic so the table, the detail tile and any future alerting agree.
 */
export type RiskBand = 'critical' | 'high' | 'medium' | 'low'

export function riskBand(score: number): RiskBand {
  if (score >= 85) return 'critical'
  if (score >= 70) return 'high'
  if (score >= 50) return 'medium'
  return 'low'
}

/** Average risk score across a set of signals, rounded; 0 for an empty set. */
export function averageRiskScore(scores: readonly number[]): number {
  if (scores.length === 0) return 0
  const total = scores.reduce((sum, score) => sum + score, 0)
  return Math.round(total / scores.length)
}
