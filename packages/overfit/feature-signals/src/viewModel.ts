// View model for the Signals Explorer. The page never renders a raw DTO; it maps each Signal to a
// row VM first (the mandatory presentation seam in the Overfit frontend flow).

import type { RiskTrend, Signal } from '@signalops/overfit-contracts-generated'
import { confidenceLabel, formatSource, riskColor, riskTrendLabel } from '@signalops/overfit-ui'

export interface SignalRowVM {
  id: string
  title: string
  severity: Signal['severity']
  status: Signal['status']
  sourceLabel: string
  riskScore: number
  riskColor: string
  riskTrend?: RiskTrend
  riskTrendLabel: string
  confidenceLabel: string
  confidenceAvailable: boolean
  assignedTo: string | null
  createdDate: string
  hasLinkedIncident: boolean
}

export function toSignalRow(s: Signal): SignalRowVM {
  return {
    id: s.id,
    title: s.title,
    severity: s.severity,
    status: s.status,
    sourceLabel: formatSource(s.source),
    riskScore: s.riskScore,
    riskColor: riskColor(s.riskScore),
    riskTrend: s.riskTrend,
    riskTrendLabel: s.riskTrend ? riskTrendLabel(s.riskTrend) : 'Unknown',
    confidenceLabel: confidenceLabel(s.confidence),
    confidenceAvailable: s.confidence !== null,
    assignedTo: s.assignedTo,
    createdDate: new Date(s.createdAt).toISOString().slice(0, 10),
    hasLinkedIncident: s.hasLinkedIncident
  }
}

export const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const
export const STATUSES = ['new', 'triaged', 'investigating', 'resolved', 'dismissed'] as const
export const SOURCES = ['web', 'social', 'internal', 'partner', 'api', 'manual'] as const
export const RISK_TRENDS: { value: RiskTrend; label: string }[] = [
  { value: 'up', label: 'Rising' },
  { value: 'stable', label: 'Stable' },
  { value: 'down', label: 'Falling' }
]
