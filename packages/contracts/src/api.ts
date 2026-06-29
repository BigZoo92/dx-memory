import type { Signal, SignalSeverity } from './signal'
import type { Incident } from './incident'
import type { TimelineEvent } from './timeline'
import type { DxMetric } from './dx-metric'

/**
 * Canonical API error envelope. Every variant's backend must return this shape on error,
 * including the controlled `POST /api/simulate-error` endpoint.
 */
export type ApiError = {
  code: string
  message: string
  details?: unknown
  requestId: string
}

/** Generic paginated list response used by `/api/signals` and `/api/incidents`. */
export type Paginated<T> = {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/** `GET /api/health` */
export type HealthResponse = {
  status: 'ok' | 'degraded' | 'down'
  version: string
  variant: string
  datasetVersion: string
  uptimeSeconds: number
}

export type ServiceStatus = {
  name: string
  status: 'operational' | 'degraded' | 'down'
}

export type SeverityBreakdownEntry = {
  severity: SignalSeverity
  count: number
}

export type TimeseriesPoint = {
  date: string
  total: number
  critical: number
}

export type TrendDirection = 'up' | 'down' | 'flat'

export type SummaryKpi = {
  label: string
  value: number
  /** Formatted display value when the raw `value` is not directly presentable (e.g. a duration). */
  display?: string
  trend: TrendDirection
  trendLabel: string
}

/** `GET /api/dashboard/summary` — feeds the Overview screen. */
export type DashboardSummary = {
  kpis: {
    openSignals: SummaryKpi
    criticalSignals: SummaryKpi
    activeIncidents: SummaryKpi
    avgQualificationTimeMs: SummaryKpi
  }
  severityBreakdown: SeverityBreakdownEntry[]
  signalsOverTime: TimeseriesPoint[]
  mostCriticalSignals: Signal[]
  systemStatus: ServiceStatus[]
  recentIncidents: Incident[]
}

/** One attribute row in the `/compare` diff. */
export type CompareDelta = 'good' | 'bad' | 'neutral' | 'no-change'

export type CompareAttribute = {
  attribute: string
  before: string
  after: string
  changed: boolean
  delta: CompareDelta
}

/** `GET /api/compare/:id` — before/after comparison for one signal. */
export type CompareResponse = {
  signalId: string
  attributes: CompareAttribute[]
  timeline: TimelineEvent[]
  impactSentence: string
  impactMetrics: Array<{ label: string; delta: CompareDelta; value: string }>
}

/** `GET /api/dx-metrics` — all three variants for the comparison screen. */
export type DxMetricsResponse = {
  metrics: DxMetric[]
  /** Variant currently being shown (drives column highlight). */
  current: DxMetric['variant']
  source: 'collected' | 'seed'
}

export type SignalDetailResponse = {
  signal: Signal
  linkedIncident: Incident | null
}

/**
 * Canonical API route table. Variants are free to implement these however they like
 * (Fastify, TanStack Start server routes, Rust Axum, …) but the paths and semantics
 * must match `docs/product/00-product-contract.md`.
 */
export const API_ROUTES = {
  health: '/api/health',
  signals: '/api/signals',
  signalById: (id: string) => `/api/signals/${id}`,
  signalEvents: (id: string) => `/api/signals/${id}/events`,
  incidents: '/api/incidents',
  dashboardSummary: '/api/dashboard/summary',
  compareById: (id: string) => `/api/compare/${id}`,
  dxMetrics: '/api/dx-metrics',
  simulateError: '/api/simulate-error'
} as const

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ApiError).code === 'string' &&
    typeof (value as ApiError).message === 'string' &&
    typeof (value as ApiError).requestId === 'string'
  )
}
