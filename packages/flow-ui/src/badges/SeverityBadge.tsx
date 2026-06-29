import type { SignalSeverity } from '@signalops/contracts'
import { severityHue } from '@signalops/ui-spec'
import { Badge } from './Badge'

const LABELS: Record<SignalSeverity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical'
}

/** Severity pill (Low=blue, Medium=amber, High=orange, Critical=red), always with a text label. */
export function SeverityBadge({ severity }: { severity: SignalSeverity }) {
  return <Badge hue={severityHue[severity]}>{LABELS[severity]}</Badge>
}
