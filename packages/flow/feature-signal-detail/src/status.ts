import { SIGNAL_STATUSES, type SignalStatus } from '@signalops/contracts'

/** Next status in the lifecycle (wraps), used by the "Change status" action. */
export function nextStatus(current: SignalStatus): SignalStatus {
  const idx = SIGNAL_STATUSES.indexOf(current)
  return SIGNAL_STATUSES[(idx + 1) % SIGNAL_STATUSES.length]
}
