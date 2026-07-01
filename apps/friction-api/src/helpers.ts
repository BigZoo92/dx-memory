// Grab-bag of helpers for the Friction API: filtering, sorting, formatting, KPI math, confidence
// bands and the compare diff all live here. It is not split by concern-when something needs a
// helper it gets added to this file.

import type {
  Analyst,
  CompareAttribute,
  CompareDelta,
  CompareResponse,
  DashboardSummary,
  Incident,
  Severity,
  ServiceStatus,
  Signal,
  SignalStatus,
  SignalSource,
  SignalsQuery,
  SummaryKpi,
  TimelineEvent
} from './types'
import { REFERENCE_NOW } from './dataset'

export const DEFAULT_PAGE_SIZE = 50
export const MAX_PAGE_SIZE = 200
export const UNASSIGNED = 'unassigned'

// Severity ranking. NOTE: this is also redefined in a couple of controllers - keep them the same.
export const SEVERITY_RANK: Record<Severity, number> = { critical: 3, high: 2, medium: 1, low: 0 }

export function severityRank(s: Severity): number {
  return SEVERITY_RANK[s]
}

export function formatSeverity(s: Severity): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function formatStatus(s: SignalStatus): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const SOURCE_LABELS: Record<SignalSource, string> = {
  web: 'Web',
  social: 'Social',
  internal: 'Internal',
  partner: 'Partner',
  api: 'API',
  manual: 'Manual'
}

export function formatSource(source: SignalSource): string {
  return SOURCE_LABELS[source]
}

export function isOpenStatus(status: SignalStatus): boolean {
  return status !== 'resolved' && status !== 'dismissed'
}

// ---- confidence bands -------------------------------------------------------

const HIGH_THRESHOLD = 0.66
const MEDIUM_THRESHOLD = 0.33

export function confidenceLabel(confidence: number | null): string {
  if (confidence === null || Number.isNaN(confidence)) return 'Unavailable'
  const clamped = Math.min(1, Math.max(0, confidence))
  if (clamped >= HIGH_THRESHOLD) return 'High'
  if (clamped >= MEDIUM_THRESHOLD) return 'Medium'
  return 'Low'
}

function confidenceOrder(confidence: number | null): number {
  const label = confidenceLabel(confidence)
  if (label === 'High') return 2
  if (label === 'Medium') return 1
  if (label === 'Low') return 0
  return -1
}

// ---- duration formatting ----------------------------------------------------

const MINUTE_MS = 60000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0m'
  const days = Math.floor(ms / DAY_MS)
  const hours = Math.floor((ms % DAY_MS) / HOUR_MS)
  const minutes = Math.floor((ms % HOUR_MS) / MINUTE_MS)
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  return `${minutes}m`
}

// ---- signals filter / sort / paginate --------------------------------------

export function matchesSignal(signal: Signal, query: SignalsQuery): boolean {
  if (query.severity && signal.severity !== query.severity) return false
  if (query.status && signal.status !== query.status) return false
  if (query.source && signal.source !== query.source) return false
  if (query.assignedTo) {
    if (query.assignedTo === UNASSIGNED) {
      if (signal.assignedTo !== null) return false
    } else if (signal.assignedTo !== query.assignedTo) {
      return false
    }
  }
  if (query.dateFrom && signal.createdAt < query.dateFrom) return false
  if (query.dateTo && signal.createdAt > query.dateTo) return false
  if (query.search) {
    const needle = query.search.trim().toLowerCase()
    if (needle.length > 0) {
      const haystack = [signal.title, signal.id, signal.source, signal.assignedTo || '']
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(needle)) return false
    }
  }
  return true
}

function sortValue(signal: Signal, field: NonNullable<SignalsQuery['sortBy']>): number | string {
  switch (field) {
    case 'createdAt':
      return signal.createdAt
    case 'riskScore':
      return signal.riskScore
    case 'confidence':
      return signal.confidence === null ? -1 : signal.confidence
    case 'severity':
      return severityRank(signal.severity)
  }
}

export function querySignals(all: Signal[], query: SignalsQuery) {
  const filtered = all.filter((s) => matchesSignal(s, query))
  const field = query.sortBy || 'riskScore'
  const direction = query.sortDirection || 'desc'
  const factor = direction === 'asc' ? 1 : -1
  const sorted = filtered.slice().sort((a, b) => {
    const va = sortValue(a, field)
    const vb = sortValue(b, field)
    if (va < vb) return -1 * factor
    if (va > vb) return 1 * factor
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })
  const pageSize = query.pageSize || DEFAULT_PAGE_SIZE
  const total = sorted.length
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize)
  const page = Math.min(Math.max(1, query.page || 1), Math.max(1, totalPages))
  const start = (page - 1) * pageSize
  const items = sorted.slice(start, start + pageSize)
  return { items, page, pageSize, total, totalPages }
}

// ---- dashboard --------------------------------------------------------------

const SYSTEM_STATUS: ServiceStatus[] = [
  { name: 'Ingestion pipeline', status: 'operational' },
  { name: 'Signal scoring', status: 'operational' },
  { name: 'Partner API connector', status: 'degraded' },
  { name: 'Notification service', status: 'operational' },
  { name: 'Export worker', status: 'down' }
]

function kpi(
  label: string,
  value: number,
  trend: SummaryKpi['trend'],
  trendLabel: string,
  display?: string
): SummaryKpi {
  return display === undefined
    ? { label, value, trend, trendLabel }
    : { label, value, display, trend, trendLabel }
}

export function buildDashboard(signals: Signal[], incidents: Incident[]): DashboardSummary {
  let openSignals = 0
  let criticalSignals = 0
  let qualifiedCount = 0
  let qualifiedTotalMs = 0
  for (const signal of signals) {
    if (isOpenStatus(signal.status)) openSignals++
    if (signal.severity === 'critical' && isOpenStatus(signal.status)) criticalSignals++
    if (signal.status !== 'new') {
      const delta = Date.parse(signal.updatedAt) - Date.parse(signal.createdAt)
      if (Number.isFinite(delta) && delta > 0) {
        qualifiedTotalMs += delta
        qualifiedCount++
      }
    }
  }
  const activeIncidents = incidents.filter((i) => i.status !== 'resolved').length
  const avgQualificationTimeMs =
    qualifiedCount === 0 ? 0 : Math.round(qualifiedTotalMs / qualifiedCount)

  const severityCounts: Record<Severity, number> = { low: 0, medium: 0, high: 0, critical: 0 }
  for (const signal of signals) {
    if (isOpenStatus(signal.status)) severityCounts[signal.severity]++
  }
  const severityBreakdown = (['low', 'medium', 'high', 'critical'] as Severity[])
    .map((severity) => ({ severity, count: severityCounts[severity] }))
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))

  const signalsOverTime = buildSignalsOverTime(signals, REFERENCE_NOW, 14)

  const mostCriticalSignals = signals
    .filter((s) => isOpenStatus(s.status) && (s.severity === 'critical' || s.severity === 'high'))
    .sort(
      (a, b) =>
        b.riskScore - a.riskScore ||
        severityRank(b.severity) - severityRank(a.severity) ||
        (a.id < b.id ? -1 : 1)
    )
    .slice(0, 8)

  const recentIncidents = incidents
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
    .slice(0, 5)

  return {
    kpis: {
      openSignals: kpi('Open signals', openSignals, 'up', 'vs last week'),
      criticalSignals: kpi('Critical signals', criticalSignals, 'up', 'new today'),
      activeIncidents: kpi('Active incidents', activeIncidents, 'down', 'vs yesterday'),
      avgQualificationTimeMs: kpi(
        'Avg qualification time',
        avgQualificationTimeMs,
        'down',
        'faster than avg',
        formatDuration(avgQualificationTimeMs)
      )
    },
    severityBreakdown,
    signalsOverTime,
    mostCriticalSignals,
    systemStatus: SYSTEM_STATUS,
    recentIncidents
  }
}

function startOfUtcDay(ms: number): number {
  return Math.floor(ms / DAY_MS) * DAY_MS
}

function toDateKey(ms: number): string {
  return new Date(startOfUtcDay(ms)).toISOString().slice(0, 10)
}

function buildSignalsOverTime(signals: Signal[], now: number, days: number) {
  const buckets = new Map<string, { total: number; critical: number }>()
  const startDay = startOfUtcDay(now - (days - 1) * DAY_MS)
  for (let i = 0; i < days; i++) {
    buckets.set(toDateKey(startDay + i * DAY_MS), { total: 0, critical: 0 })
  }
  for (const signal of signals) {
    const key = toDateKey(Date.parse(signal.createdAt))
    const bucket = buckets.get(key)
    if (bucket) {
      bucket.total++
      if (signal.severity === 'critical') bucket.critical++
    }
  }
  return [...buckets.entries()].map(([date, { total, critical }]) => ({ date, total, critical }))
}

// ---- compare ----------------------------------------------------------------

const PRIOR_SEVERITY: Record<Severity, Severity> = {
  critical: 'high',
  high: 'medium',
  medium: 'low',
  low: 'low'
}

function severityDelta(before: Severity, after: Severity): CompareDelta {
  const diff = severityRank(after) - severityRank(before)
  if (diff > 0) return 'bad'
  if (diff < 0) return 'good'
  return 'no-change'
}

function riskDelta(before: number, after: number): CompareDelta {
  if (after > before) return 'bad'
  if (after < before) return 'good'
  return 'no-change'
}

function confidenceDelta(before: number | null, after: number | null): CompareDelta {
  const diff = confidenceOrder(after) - confidenceOrder(before)
  if (diff > 0) return 'good'
  if (diff < 0) return 'bad'
  return 'no-change'
}

function assignmentDelta(before: string | null, after: string | null): CompareDelta {
  if (before === after) return 'no-change'
  if (before === null && after !== null) return 'good'
  if (before !== null && after === null) return 'bad'
  return 'neutral'
}

function attr(label: string, before: string, after: string, delta: CompareDelta): CompareAttribute {
  return { attribute: label, before, after, changed: before !== after, delta }
}

export function buildCompare(
  signal: Signal,
  analysts: Analyst[],
  events: TimelineEvent[]
): CompareResponse {
  const analystName = (id: string | null): string =>
    id === null ? 'Unassigned' : (analysts.find((a) => a.id === id)?.name ?? id)

  const beforeSeverity = PRIOR_SEVERITY[signal.severity]
  const beforeRisk = Math.max(0, signal.riskScore - 13)
  const afterRecommended =
    signal.severity === 'critical' ? 'Escalate to incident' : 'Review before escalation'

  const attributes: CompareAttribute[] = [
    attr(
      'Severity',
      formatSeverity(beforeSeverity),
      formatSeverity(signal.severity),
      severityDelta(beforeSeverity, signal.severity)
    ),
    attr(
      'Status',
      'New',
      formatStatus(signal.status),
      signal.status === 'new' ? 'no-change' : 'neutral'
    ),
    attr(
      'Risk score',
      String(beforeRisk),
      String(signal.riskScore),
      riskDelta(beforeRisk, signal.riskScore)
    ),
    attr(
      'Confidence',
      confidenceLabel(signal.confidence),
      confidenceLabel(signal.confidence),
      confidenceDelta(signal.confidence, signal.confidence)
    ),
    attr(
      'Assigned to',
      'Unassigned',
      analystName(signal.assignedTo),
      assignmentDelta(null, signal.assignedTo)
    ),
    attr('Recommended action', 'Monitor for 24h', afterRecommended, 'neutral')
  ]

  const timeline = events
    .filter((e) => e.signalId === signal.id)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0))
    .slice(0, 6)

  return {
    signalId: signal.id,
    attributes,
    timeline,
    impactSentence: 'This change reduces qualification time but increases review scope.',
    impactMetrics: [
      { label: 'Qualification time', delta: 'good', value: '−22%' },
      { label: 'Review scope', delta: 'bad', value: '+3 signals' },
      { label: 'Time to escalate', delta: 'good', value: '−14m' }
    ]
  }
}
