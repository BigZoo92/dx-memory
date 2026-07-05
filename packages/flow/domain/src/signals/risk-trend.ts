import type { RiskTrend } from '@signalops/contracts'

/**
 * Risk-trend derivation — the cross-variant "cost of change" capability
 * (`docs/product/03-ai-task-protocol.md`). The rule is part of the shared product
 * spec so all three variants render the same trend for the same dataset:
 * a signal's risk is rising at ≥80, falling at ≤35, stable in between.
 */
export function deriveRiskTrend(riskScore: number): RiskTrend {
  if (riskScore >= 80) return 'up'
  if (riskScore <= 35) return 'down'
  return 'stable'
}
