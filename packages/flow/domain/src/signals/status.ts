import type { SignalSource, SignalStatus } from '@signalops/contracts'

/** Human label for a signal status (`investigating` → `Investigating`). */
export function formatStatus(status: SignalStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

/** A signal is "open" (counts toward the live workload) unless it is resolved or dismissed. */
export function isOpenStatus(status: SignalStatus): boolean {
  return status !== 'resolved' && status !== 'dismissed'
}

const SOURCE_LABELS: Record<SignalSource, string> = {
  web: 'Web',
  social: 'Social',
  internal: 'Internal',
  partner: 'Partner',
  api: 'API',
  manual: 'Manual'
}

/** Human label for a source category (`api` → `API`). */
export function formatSource(source: SignalSource): string {
  return SOURCE_LABELS[source]
}
