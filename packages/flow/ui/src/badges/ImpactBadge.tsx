import type { IncidentImpact, IncidentStatus } from '@signalops/contracts'
import { impactHue, type HueName } from '@signalops/ui-spec'
import { Badge } from './Badge'

const IMPACT_LABELS: Record<IncidentImpact, string> = {
  user: 'User',
  system: 'System',
  security: 'Security',
  business: 'Business'
}

/** Incident impact pill (User=blue, System=grey, Security=red, Business=green). */
export function ImpactBadge({ impact }: { impact: IncidentImpact }) {
  return <Badge hue={impactHue[impact]}>{IMPACT_LABELS[impact]}</Badge>
}

const INCIDENT_STATUS: Record<IncidentStatus, { label: string; hue: HueName }> = {
  open: { label: 'Open', hue: 'blue' },
  in_progress: { label: 'In progress', hue: 'orange' },
  resolved: { label: 'Resolved', hue: 'green' }
}

/** Incident status pill (Open=blue, In progress=orange, Resolved=green). */
export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  const meta = INCIDENT_STATUS[status]
  return <Badge hue={meta.hue}>{meta.label}</Badge>
}
