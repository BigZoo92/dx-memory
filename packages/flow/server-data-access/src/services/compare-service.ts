import { Context, Effect, Layer } from 'effect'
import {
  type Analyst,
  type CompareAttribute,
  type CompareDelta,
  type CompareResponse,
  type Signal,
  type SignalSeverity,
  type TimelineEvent
} from '@signalops/contracts'
import {
  compareAssignmentDelta,
  compareConfidenceDelta,
  compareRiskDelta,
  compareSeverityDelta,
  confidenceLabel,
  formatSeverity,
  formatStatus
} from '@signalops/flow-domain'
import { Dataset } from '../effect/dataset'
import { failNotFound } from '../effect/errors'
import type { RequestContext } from '../effect/request-context'
import type { FlowNotFoundError } from '@signalops/flow-effect'

// API-owned response copy. Kept here (not imported from @signalops/ui-spec) so data-access
// stays free of any UI dependency; the strings match the canonical microcopy in the spec.
const UNASSIGNED_LABEL = 'Unassigned'
const COMPARE_IMPACT_SENTENCE = 'This change reduces qualification time but increases review scope.'

/** The severity one rung below `after`, used to synthesize a plausible "before". */
const PRIOR_SEVERITY: Record<SignalSeverity, SignalSeverity> = {
  critical: 'high',
  high: 'medium',
  medium: 'low',
  low: 'low'
}

function attribute(
  label: string,
  before: string,
  after: string,
  delta: CompareDelta
): CompareAttribute {
  return { attribute: label, before, after, changed: before !== after, delta }
}

/**
 * Build the before/after comparison from already-resolved data. The "after" is the real signal; the
 * "before" is synthesized deterministically (severity de-escalated one rung, risk −13, was
 * unassigned) so the diff is meaningful and reproducible. Pure — the not-found case is handled by
 * the service that looks the signal up.
 */
export function buildCompareResponse(
  signal: Signal,
  analysts: readonly Analyst[],
  events: readonly TimelineEvent[]
): CompareResponse {
  const analystName = (id: string | null): string =>
    id === null ? UNASSIGNED_LABEL : (analysts.find((a) => a.id === id)?.name ?? id)

  const beforeSeverity = PRIOR_SEVERITY[signal.severity]
  const beforeRisk = Math.max(0, signal.riskScore - 13)
  const beforeRecommended = 'Monitor for 24h'
  const afterRecommended =
    signal.severity === 'critical' ? 'Escalate to incident' : 'Review before escalation'

  const attributes: CompareAttribute[] = [
    attribute(
      'Severity',
      formatSeverity(beforeSeverity),
      formatSeverity(signal.severity),
      compareSeverityDelta(beforeSeverity, signal.severity)
    ),
    attribute(
      'Status',
      'New',
      formatStatus(signal.status),
      signal.status === 'new' ? 'no-change' : 'neutral'
    ),
    attribute(
      'Risk score',
      String(beforeRisk),
      String(signal.riskScore),
      compareRiskDelta(beforeRisk, signal.riskScore)
    ),
    attribute(
      'Confidence',
      confidenceLabel({ confidence: signal.confidence }),
      confidenceLabel({ confidence: signal.confidence }),
      compareConfidenceDelta(signal.confidence, signal.confidence)
    ),
    attribute(
      'Assigned to',
      UNASSIGNED_LABEL,
      analystName(signal.assignedTo),
      compareAssignmentDelta(null, signal.assignedTo)
    ),
    attribute('Recommended action', beforeRecommended, afterRecommended, 'neutral')
  ]

  const timeline = events
    .filter((event) => event.signalId === signal.id)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0))
    .slice(0, 6)

  return {
    signalId: signal.id,
    attributes,
    timeline,
    impactSentence: COMPARE_IMPACT_SENTENCE,
    impactMetrics: [
      { label: 'Qualification time', delta: 'good', value: '−22%' },
      { label: 'Review scope', delta: 'bad', value: '+3 signals' },
      { label: 'Time to escalate', delta: 'good', value: '−14m' }
    ]
  }
}

export interface CompareServiceShape {
  readonly build: (
    signalId: string
  ) => Effect.Effect<CompareResponse, FlowNotFoundError, RequestContext>
}

export class CompareService extends Context.Tag('@signalops/flow/CompareService')<
  CompareService,
  CompareServiceShape
>() {}

export const CompareServiceLive = Layer.effect(
  CompareService,
  Effect.gen(function* () {
    const dataset = yield* Dataset
    return CompareService.of({
      build: (signalId) =>
        Effect.gen(function* () {
          const signals = yield* dataset.signals
          const signal = signals.find((s) => s.id === signalId)
          if (!signal) return yield* failNotFound('Signal', signalId)
          const analysts = yield* dataset.analysts
          const events = yield* dataset.events
          return buildCompareResponse(signal, analysts, events)
        })
    })
  })
)
