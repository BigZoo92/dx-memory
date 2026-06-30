import type { CompareDelta, SignalSeverity } from '@signalops/contracts'
import { severityRank } from '../signals/severity'
import { normalizeConfidence } from '../signals/confidence'

/**
 * Delta classification for the Compare diff. The convention is product-facing, not numeric:
 * a change is "bad" when it makes the situation worse for the analyst (more severe, higher
 * risk), "good" when it improves it, "neutral" for a lateral change, "no-change" when equal.
 */

/** Severity escalation is bad; de-escalation is good. */
export function compareSeverityDelta(before: SignalSeverity, after: SignalSeverity): CompareDelta {
  const diff = severityRank(after) - severityRank(before)
  if (diff > 0) return 'bad'
  if (diff < 0) return 'good'
  return 'no-change'
}

/** A rising risk score is bad; a falling one is good. */
export function compareRiskDelta(before: number, after: number): CompareDelta {
  if (after > before) return 'bad'
  if (after < before) return 'good'
  return 'no-change'
}

/** More confidence is good; less is bad — compared by band, since labels are what users see. */
export function compareConfidenceDelta(before: number | null, after: number | null): CompareDelta {
  const order: Record<string, number> = { unavailable: -1, low: 0, medium: 1, high: 2 }
  const diff = order[normalizeConfidence(after).band] - order[normalizeConfidence(before).band]
  if (diff > 0) return 'good'
  if (diff < 0) return 'bad'
  return 'no-change'
}

/** Gaining an assignee is good; losing one is bad; a reassignment is neutral. */
export function compareAssignmentDelta(before: string | null, after: string | null): CompareDelta {
  if (before === after) return 'no-change'
  if (before === null && after !== null) return 'good'
  if (before !== null && after === null) return 'bad'
  return 'neutral'
}
