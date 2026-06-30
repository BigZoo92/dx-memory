import type { SignalStatus } from '@signalops/contracts'
import { statusHue } from '@signalops/ui-spec'
import { Badge } from './Badge'

const LABELS: Record<SignalStatus, string> = {
  new: 'New',
  triaged: 'Triaged',
  investigating: 'Investigating',
  resolved: 'Resolved',
  dismissed: 'Dismissed'
}

/** Signal status pill (New=blue, Triaged=amber, Investigating=orange, Resolved=green, Dismissed=grey). */
export function StatusBadge({ status }: { status: SignalStatus }) {
  return <Badge hue={statusHue[status]}>{LABELS[status]}</Badge>
}
