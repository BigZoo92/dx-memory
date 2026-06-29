/**
 * Signal — the core entity of SignalOps.
 *
 * This type is the binding contract from `docs/product/00-product-contract.md`.
 * All three variants MUST use this exact shape. Do not add, remove or rename fields
 * to make a variant easier.
 */

export type SignalSeverity = 'low' | 'medium' | 'high' | 'critical'

export type SignalStatus = 'new' | 'triaged' | 'investigating' | 'resolved' | 'dismissed'

export type SignalSource = 'web' | 'social' | 'internal' | 'partner' | 'api' | 'manual'

/**
 * Risk trend direction.
 *
 * NOTE: `riskTrend` is intentionally NOT populated by the socle fixtures. Adding and
 * wiring it across the product (`/signals` column + filter, `/signals/:id`, fixtures,
 * API, validation, tests, `/dx-metrics`) is the shared "AI cost-of-change" task defined
 * in `docs/product/03-ai-task-protocol.md`. Keep it optional here so the contract stays
 * forward-compatible while the change itself remains a genuine, measurable task.
 */
export type RiskTrend = 'up' | 'stable' | 'down'

export type Signal = {
  id: string
  title: string
  description: string
  severity: SignalSeverity
  status: SignalStatus
  source: SignalSource
  /** Model confidence in [0, 1], or `null` when unavailable (drives the "Confidence unavailable" state). */
  confidence: number | null
  /** Risk score in [0, 100]. */
  riskScore: number
  /** Reserved for the AI cost-of-change task — see `RiskTrend`. */
  riskTrend?: RiskTrend
  region: string
  assignedTo: string | null
  createdAt: string
  updatedAt: string
  tags: string[]
  hasLinkedIncident: boolean
}

export const SIGNAL_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const
export const SIGNAL_STATUSES = ['new', 'triaged', 'investigating', 'resolved', 'dismissed'] as const
export const SIGNAL_SOURCES = ['web', 'social', 'internal', 'partner', 'api', 'manual'] as const
export const RISK_TRENDS = ['up', 'stable', 'down'] as const

export function isSignalSeverity(value: unknown): value is SignalSeverity {
  return typeof value === 'string' && (SIGNAL_SEVERITIES as readonly string[]).includes(value)
}

export function isSignalStatus(value: unknown): value is SignalStatus {
  return typeof value === 'string' && (SIGNAL_STATUSES as readonly string[]).includes(value)
}

export function isSignalSource(value: unknown): value is SignalSource {
  return typeof value === 'string' && (SIGNAL_SOURCES as readonly string[]).includes(value)
}
