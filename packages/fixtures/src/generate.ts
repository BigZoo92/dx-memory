import type {
  Analyst,
  AnalystRole,
  DxMetric,
  Incident,
  IncidentImpact,
  IncidentStatus,
  Signal,
  SignalSeverity,
  SignalStatus,
  Source,
  TimelineEvent,
  TimelineEventType
} from '@signalops/contracts'
import { Random } from './random'
import {
  ANALYST_NAMES,
  DAY_MS,
  DEFAULT_SEED,
  DX_METRICS_SEED,
  FIXTURE_COUNTS,
  INCIDENT_TITLES,
  REFERENCE_NOW,
  REGIONS,
  SIGNAL_TITLES,
  SOURCE_DEFINITIONS,
  TAGS,
  WINDOW_DAYS
} from './constants'

export type Dataset = {
  analysts: Analyst[]
  sources: Source[]
  signals: Signal[]
  incidents: Incident[]
  events: TimelineEvent[]
  dxMetricsSeed: DxMetric[]
}

const SEVERITY_WEIGHTS: ReadonlyArray<readonly [SignalSeverity, number]> = [
  ['low', 40],
  ['medium', 33],
  ['high', 19],
  ['critical', 8]
]

const STATUS_WEIGHTS: ReadonlyArray<readonly [SignalStatus, number]> = [
  ['new', 28],
  ['triaged', 24],
  ['investigating', 22],
  ['resolved', 18],
  ['dismissed', 8]
]

const INCIDENT_SEVERITY_WEIGHTS: ReadonlyArray<readonly [SignalSeverity, number]> = [
  ['low', 10],
  ['medium', 30],
  ['high', 35],
  ['critical', 25]
]

const INCIDENT_STATUS_WEIGHTS: ReadonlyArray<readonly [IncidentStatus, number]> = [
  ['open', 35],
  ['in_progress', 30],
  ['resolved', 35]
]

const INCIDENT_IMPACT_WEIGHTS: ReadonlyArray<readonly [IncidentImpact, number]> = [
  ['user', 30],
  ['system', 30],
  ['security', 25],
  ['business', 15]
]

const EVENT_TYPE_WEIGHTS: ReadonlyArray<readonly [TimelineEventType, number]> = [
  ['created', 10],
  ['updated', 30],
  ['assigned', 15],
  ['commented', 25],
  ['escalated', 8],
  ['resolved', 12]
]

const RISK_RANGE: Record<SignalSeverity, readonly [number, number]> = {
  low: [0, 39],
  medium: [30, 69],
  high: [55, 89],
  critical: [80, 100]
}

function isoBetween(rng: Random, fromMs: number, toMs: number): string {
  const span = Math.max(0, toMs - fromMs)
  return new Date(fromMs + rng.int(0, span)).toISOString()
}

export function generateAnalysts(rng: Random, count: number = FIXTURE_COUNTS.analysts): Analyst[] {
  return Array.from({ length: count }, (_, i) => {
    const name = ANALYST_NAMES[i % ANALYST_NAMES.length]
    const role: AnalystRole = i === 0 ? 'admin' : i % 6 === 0 ? 'lead' : 'analyst'
    const email = `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@signalops.example`
    return {
      id: Random.id('ana', i + 1, 3),
      name,
      email,
      role,
      region: rng.pick(REGIONS)
    }
  })
}

export function generateSources(rng: Random, count: number = FIXTURE_COUNTS.sources): Source[] {
  return SOURCE_DEFINITIONS.slice(0, count).map((def, i) => ({
    id: Random.id('src', i + 1, 2),
    name: def.name,
    category: def.category,
    trustScore: rng.int(40, 99)
  }))
}

export function generateSignals(
  rng: Random,
  analysts: Analyst[],
  sources: Source[],
  count: number = FIXTURE_COUNTS.signals
): Signal[] {
  const signals: Signal[] = []
  for (let i = 0; i < count; i++) {
    const severity = rng.weighted(SEVERITY_WEIGHTS)
    const status = rng.weighted(STATUS_WEIGHTS)
    const source = rng.pick(sources)
    const region = rng.pick(REGIONS)
    const [riskMin, riskMax] = RISK_RANGE[severity]

    const createdMs = REFERENCE_NOW - rng.int(0, WINDOW_DAYS * DAY_MS)
    const createdAt = new Date(createdMs).toISOString()
    const updatedAt = isoBetween(rng, createdMs, REFERENCE_NOW)

    const assignProbability = status === 'new' ? 0.3 : 0.8
    const assignedTo = rng.bool(assignProbability) ? rng.pick(analysts).id : null

    signals.push({
      id: Random.id('sig', i + 1, 5),
      title: rng.pick(SIGNAL_TITLES),
      description: `${rng.pick(SIGNAL_TITLES)} observed on "${source.name}" (${region}). Automated qualification pending analyst review.`,
      severity,
      status,
      source: source.category,
      confidence: rng.bool(0.05) ? null : rng.float(0, 1, 2),
      riskScore: rng.int(riskMin, riskMax),
      // riskTrend intentionally omitted — see docs/product/03-ai-task-protocol.md
      region,
      assignedTo,
      createdAt,
      updatedAt,
      tags: rng.sampleUnique(TAGS, rng.int(1, 4)),
      hasLinkedIncident: false
    })
  }
  return signals
}

/**
 * Generates incidents that reference EXISTING signal ids and flips `hasLinkedIncident`
 * on the signals they reference (keeping the two datasets coherent).
 */
export function generateIncidents(
  rng: Random,
  signals: Signal[],
  analysts: Analyst[],
  count: number = FIXTURE_COUNTS.incidents
): Incident[] {
  const incidents: Incident[] = []
  for (let i = 0; i < count; i++) {
    const severity = rng.weighted(INCIDENT_SEVERITY_WEIGHTS)
    const status = rng.weighted(INCIDENT_STATUS_WEIGHTS)
    const impact = rng.weighted(INCIDENT_IMPACT_WEIGHTS)
    const linked = rng.sampleUnique(signals, rng.int(1, 5))
    for (const signal of linked) signal.hasLinkedIncident = true

    const createdMs = REFERENCE_NOW - rng.int(0, WINDOW_DAYS * DAY_MS)
    const createdAt = new Date(createdMs).toISOString()
    const resolvedAt = status === 'resolved' ? isoBetween(rng, createdMs, REFERENCE_NOW) : null

    incidents.push({
      id: Random.id('inc', i + 1, 3),
      title: rng.pick(INCIDENT_TITLES),
      severity,
      status,
      linkedSignalIds: linked.map((s) => s.id),
      owner: rng.pick(analysts).id,
      createdAt,
      resolvedAt,
      impact
    })
  }
  return incidents
}

export function generateEvents(
  rng: Random,
  signals: Signal[],
  analysts: Analyst[],
  count: number = FIXTURE_COUNTS.events
): TimelineEvent[] {
  const events: TimelineEvent[] = []
  for (let i = 0; i < count; i++) {
    const signal = rng.pick(signals)
    const type = rng.weighted(EVENT_TYPE_WEIGHTS)
    const actor = rng.bool(0.8) ? rng.pick(analysts).name : 'system'
    const signalCreatedMs = Date.parse(signal.createdAt)

    events.push({
      id: Random.id('evt', i + 1, 5),
      signalId: signal.id,
      type,
      label: labelForEvent(type, actor),
      actor,
      createdAt: isoBetween(rng, signalCreatedMs, REFERENCE_NOW)
    })
  }
  return events
}

function labelForEvent(type: TimelineEventType, actor: string): string {
  switch (type) {
    case 'created':
      return 'Signal created'
    case 'updated':
      return 'Signal fields updated'
    case 'assigned':
      return `Assigned to ${actor}`
    case 'commented':
      return 'Comment added'
    case 'escalated':
      return 'Escalated for review'
    case 'resolved':
      return 'Marked as resolved'
  }
}

/** Generate the full, coherent dataset from a single seed. */
export function generateAll(seed = DEFAULT_SEED): Dataset {
  const rng = new Random(seed)
  const analysts = generateAnalysts(rng)
  const sources = generateSources(rng)
  const signals = generateSignals(rng, analysts, sources)
  const incidents = generateIncidents(rng, signals, analysts)
  const events = generateEvents(rng, signals, analysts)
  return {
    analysts,
    sources,
    signals,
    incidents,
    events,
    dxMetricsSeed: DX_METRICS_SEED
  }
}
