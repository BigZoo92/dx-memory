import type { SignalSeverity } from './signal'

export type IncidentSeverity = SignalSeverity

export type IncidentStatus = 'open' | 'in_progress' | 'resolved'

export type IncidentImpact = 'user' | 'system' | 'security' | 'business'

export type Incident = {
  id: string
  title: string
  severity: IncidentSeverity
  status: IncidentStatus
  linkedSignalIds: string[]
  owner: string
  createdAt: string
  resolvedAt: string | null
  impact: IncidentImpact
}

export const INCIDENT_STATUSES = ['open', 'in_progress', 'resolved'] as const
export const INCIDENT_IMPACTS = ['user', 'system', 'security', 'business'] as const

export function isIncidentStatus(value: unknown): value is IncidentStatus {
  return typeof value === 'string' && (INCIDENT_STATUSES as readonly string[]).includes(value)
}

export function isIncidentImpact(value: unknown): value is IncidentImpact {
  return typeof value === 'string' && (INCIDENT_IMPACTS as readonly string[]).includes(value)
}
