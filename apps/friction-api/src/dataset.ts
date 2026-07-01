// Friction dataset. We keep our own copy of the deterministic generator instead of pulling in
// the shared fixtures package, so the backend is standalone and easy to run. Same seed + same
// algorithm as the other variants, so the numbers line up.
//
// This file mixes the RNG, the seed constants, the generators AND the in-memory dataset singleton.
// It is big on purpose-everything data-related is in one place.

import type {
  Analyst,
  DxMetric,
  Incident,
  IncidentImpact,
  IncidentStatus,
  Severity,
  Signal,
  SignalSource,
  SignalStatus,
  Source,
  TimelineEvent,
  TimelineEventType
} from './types'

/** mulberry32 PRNG. Same seed -> same sequence, on every machine. */
export class Rng {
  private state: number
  constructor(seed: number) {
    this.state = seed >>> 0
  }
  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }
  float(min: number, max: number, decimals = 2): number {
    const value = this.next() * (max - min) + min
    const factor = 10 ** decimals
    return Math.round(value * factor) / factor
  }
  bool(p = 0.5): boolean {
    return this.next() < p
  }
  pick<T>(items: readonly T[]): T {
    return items[this.int(0, items.length - 1)]
  }
  weighted<T>(entries: ReadonlyArray<readonly [T, number]>): T {
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
    let roll = this.next() * total
    for (const [value, weight] of entries) {
      roll -= weight
      if (roll < 0) return value
    }
    return entries[entries.length - 1][0]
  }
  sampleUnique<T>(items: readonly T[], count: number): T[] {
    const n = Math.min(count, items.length)
    const pool = items.slice()
    const out: T[] = []
    for (let i = 0; i < n; i++) {
      const idx = this.int(0, pool.length - 1)
      out.push(pool[idx])
      pool.splice(idx, 1)
    }
    return out
  }
  static id(prefix: string, index: number, width: number): string {
    return `${prefix}_${String(index).padStart(width, '0')}`
  }
}

export const SEED = 20260629
export const REFERENCE_NOW = Date.parse('2026-06-29T12:00:00.000Z')
const DAY_MS = 24 * 60 * 60 * 1000
const WINDOW_DAYS = 90

const COUNTS = { signals: 10000, incidents: 300, analysts: 25, sources: 12, events: 50000 }

const REGIONS = [
  'EU-West',
  'EU-Central',
  'US-East',
  'US-West',
  'APAC',
  'LATAM',
  'MEA',
  'UK',
  'Nordics',
  'DACH'
]

const TAGS = [
  'auth',
  'export',
  'latency',
  'partner-api',
  'data-leak',
  'anomaly',
  'compliance',
  'pii',
  'rate-limit',
  'geo-mismatch',
  'automation',
  'manual-review',
  'escalation',
  'fraud',
  'integrity'
]

const SIGNAL_TITLES = [
  'Unusual authentication pattern detected',
  'Partner API latency spike',
  'Suspicious document access',
  'Unexpected data export volume',
  'Critical workflow failure',
  'Manual review required',
  'Repeated failed exports from same region',
  'High-risk source correlation detected',
  'Anomalous login velocity',
  'Sensitive record accessed off-hours',
  'Spike in rate-limit rejections',
  'Possible PII leak in export batch',
  'Geo mismatch on partner session',
  'Automation job exceeded error budget',
  'Escalation threshold reached for source',
  'Integrity check mismatch on ingest'
]

const INCIDENT_TITLES = [
  'Coordinated authentication abuse',
  'Partner data pipeline degradation',
  'Mass export anomaly under investigation',
  'Suspected insider document exfiltration',
  'Cascading workflow failure',
  'Cross-region fraud cluster',
  'Compliance breach review',
  'Rate-limit saturation incident'
]

const ANALYST_NAMES = [
  'Amelia Stone',
  'Noah Bennett',
  'Priya Nair',
  'Lucas Moreau',
  'Sofia Rossi',
  'Mateo Garcia',
  'Hana Suzuki',
  'Olivier Dubois',
  'Emma Larsson',
  'Daniel Cohen',
  'Aisha Khan',
  'Liam Murphy',
  'Yuki Tanaka',
  'Clara Schmidt',
  'Diego Fernandez',
  'Maya Patel',
  'Tomas Novak',
  'Ines Costa',
  'Jonas Weber',
  'Leila Haddad',
  'Erik Johansson',
  'Nadia Petrova',
  'Samuel Adeyemi',
  'Chloe Martin',
  'Viktor Ivanov'
]

const SOURCE_DEFINITIONS: { name: string; category: SignalSource }[] = [
  { name: 'Public Web Crawler', category: 'web' },
  { name: 'Brand Mentions Feed', category: 'web' },
  { name: 'Social Listening Stream', category: 'social' },
  { name: 'Community Reports', category: 'social' },
  { name: 'Internal Audit Log', category: 'internal' },
  { name: 'Employee Activity Monitor', category: 'internal' },
  { name: 'Partner Webhook Gateway', category: 'partner' },
  { name: 'Partner Data Exchange', category: 'partner' },
  { name: 'Detection API v1', category: 'api' },
  { name: 'Detection API v2', category: 'api' },
  { name: 'Analyst Manual Entry', category: 'manual' },
  { name: 'Escalation Desk', category: 'manual' }
]

const SEVERITY_WEIGHTS: [Severity, number][] = [
  ['low', 40],
  ['medium', 33],
  ['high', 19],
  ['critical', 8]
]
const STATUS_WEIGHTS: [SignalStatus, number][] = [
  ['new', 28],
  ['triaged', 24],
  ['investigating', 22],
  ['resolved', 18],
  ['dismissed', 8]
]
const INCIDENT_SEVERITY_WEIGHTS: [Severity, number][] = [
  ['low', 10],
  ['medium', 30],
  ['high', 35],
  ['critical', 25]
]
const INCIDENT_STATUS_WEIGHTS: [IncidentStatus, number][] = [
  ['open', 35],
  ['in_progress', 30],
  ['resolved', 35]
]
const INCIDENT_IMPACT_WEIGHTS: [IncidentImpact, number][] = [
  ['user', 30],
  ['system', 30],
  ['security', 25],
  ['business', 15]
]
const EVENT_TYPE_WEIGHTS: [TimelineEventType, number][] = [
  ['created', 10],
  ['updated', 30],
  ['assigned', 15],
  ['commented', 25],
  ['escalated', 8],
  ['resolved', 12]
]
const RISK_RANGE: Record<Severity, [number, number]> = {
  low: [0, 39],
  medium: [30, 69],
  high: [55, 89],
  critical: [80, 100]
}

function isoBetween(rng: Rng, fromMs: number, toMs: number): string {
  const span = Math.max(0, toMs - fromMs)
  return new Date(fromMs + rng.int(0, span)).toISOString()
}

function eventLabel(type: TimelineEventType, actor: string): string {
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

function buildAnalysts(rng: Rng): Analyst[] {
  return Array.from({ length: COUNTS.analysts }, (_, i) => {
    const name = ANALYST_NAMES[i % ANALYST_NAMES.length]
    const role: Analyst['role'] = i === 0 ? 'admin' : i % 6 === 0 ? 'lead' : 'analyst'
    const email = `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@signalops.example`
    return { id: Rng.id('ana', i + 1, 3), name, email, role, region: rng.pick(REGIONS) }
  })
}

function buildSources(rng: Rng): Source[] {
  return SOURCE_DEFINITIONS.slice(0, COUNTS.sources).map((def, i) => ({
    id: Rng.id('src', i + 1, 2),
    name: def.name,
    category: def.category,
    trustScore: rng.int(40, 99)
  }))
}

function buildSignals(rng: Rng, analysts: Analyst[], sources: Source[]): Signal[] {
  const signals: Signal[] = []
  for (let i = 0; i < COUNTS.signals; i++) {
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
      id: Rng.id('sig', i + 1, 5),
      title: rng.pick(SIGNAL_TITLES),
      description: `${rng.pick(SIGNAL_TITLES)} observed on "${source.name}" (${region}). Automated qualification pending analyst review.`,
      severity,
      status,
      source: source.category,
      confidence: rng.bool(0.05) ? null : rng.float(0, 1, 2),
      riskScore: rng.int(riskMin, riskMax),
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

function buildIncidents(rng: Rng, signals: Signal[], analysts: Analyst[]): Incident[] {
  const incidents: Incident[] = []
  for (let i = 0; i < COUNTS.incidents; i++) {
    const severity = rng.weighted(INCIDENT_SEVERITY_WEIGHTS)
    const status = rng.weighted(INCIDENT_STATUS_WEIGHTS)
    const impact = rng.weighted(INCIDENT_IMPACT_WEIGHTS)
    const linked = rng.sampleUnique(signals, rng.int(1, 5))
    for (const signal of linked) signal.hasLinkedIncident = true
    const createdMs = REFERENCE_NOW - rng.int(0, WINDOW_DAYS * DAY_MS)
    const createdAt = new Date(createdMs).toISOString()
    const resolvedAt = status === 'resolved' ? isoBetween(rng, createdMs, REFERENCE_NOW) : null
    incidents.push({
      id: Rng.id('inc', i + 1, 3),
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

function buildEvents(rng: Rng, signals: Signal[], analysts: Analyst[]): TimelineEvent[] {
  const events: TimelineEvent[] = []
  for (let i = 0; i < COUNTS.events; i++) {
    const signal = rng.pick(signals)
    const type = rng.weighted(EVENT_TYPE_WEIGHTS)
    const actor = rng.bool(0.8) ? rng.pick(analysts).name : 'system'
    const signalCreatedMs = Date.parse(signal.createdAt)
    events.push({
      id: Rng.id('evt', i + 1, 5),
      signalId: signal.id,
      type,
      label: eventLabel(type, actor),
      actor,
      createdAt: isoBetween(rng, signalCreatedMs, REFERENCE_NOW)
    })
  }
  return events
}

export type Dataset = {
  analysts: Analyst[]
  sources: Source[]
  signals: Signal[]
  incidents: Incident[]
  events: TimelineEvent[]
}

let cached: Dataset | null = null

// Build the whole dataset once, lazily, and hold it in memory for the process lifetime.
export function getDataset(): Dataset {
  if (cached) return cached
  const rng = new Rng(SEED)
  const analysts = buildAnalysts(rng)
  const sources = buildSources(rng)
  const signals = buildSignals(rng, analysts, sources)
  const incidents = buildIncidents(rng, signals, analysts)
  const events = buildEvents(rng, signals, analysts)
  cached = { analysts, sources, signals, incidents, events }
  return cached
}

// Seed / demo DX metrics for all three variants. These are transcribed numbers, not measurements.
export const DX_METRICS_SEED: DxMetric[] = [
  {
    variant: 'friction',
    installTimeMs: 48000,
    typecheckTimeMs: 19000,
    testTimeMs: 160000,
    buildTimeMs: 72000,
    dockerBuildTimeMs: 250000,
    ciDurationMs: 560000,
    bundleSizeKb: 412,
    mainChunkSizeKb: 287,
    lighthousePerformance: 71,
    tableRenderTimeMs: 480,
    filesTouchedForAiTask: 23,
    testsImpacted: 48,
    errorReproductionSteps: 7,
    docsPagesNeeded: 5,
    aiTaskResult: 'partial'
  },
  {
    variant: 'flow',
    installTimeMs: 22000,
    typecheckTimeMs: 8000,
    testTimeMs: 54000,
    buildTimeMs: 38000,
    dockerBuildTimeMs: 110000,
    ciDurationMs: 220000,
    bundleSizeKb: 198,
    mainChunkSizeKb: 121,
    lighthousePerformance: 94,
    tableRenderTimeMs: 120,
    filesTouchedForAiTask: 6,
    testsImpacted: 9,
    errorReproductionSteps: 2,
    docsPagesNeeded: 1,
    aiTaskResult: 'success'
  },
  {
    variant: 'overfit',
    installTimeMs: 31000,
    typecheckTimeMs: 12000,
    testTimeMs: 98000,
    buildTimeMs: 26000,
    dockerBuildTimeMs: 125000,
    ciDurationMs: 310000,
    bundleSizeKb: 164,
    mainChunkSizeKb: 96,
    lighthousePerformance: 97,
    tableRenderTimeMs: 90,
    filesTouchedForAiTask: 41,
    testsImpacted: 72,
    errorReproductionSteps: 9,
    docsPagesNeeded: 8,
    aiTaskResult: 'partial'
  }
]
