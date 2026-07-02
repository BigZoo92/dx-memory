// -----------------------------------------------------------------------------
// GENERATED FILE — DO NOT EDIT BY HAND.
// Source of truth: generated/overfit/openapi.json
// Regenerate: `pnpm overfit:contracts:generate`
// Drift check: `pnpm overfit:contracts:check`
// -----------------------------------------------------------------------------
//
// In a leaner variant these types would be hand-written once and shared. Overfit generates them
// from the backend's OpenAPI document into their own package, then guards them with a drift check
// and a runtime validator. That is the cost this package exists to demonstrate.

export const GENERATED_FROM = 'generated/overfit/openapi.json'
export const CONTRACTS_SCHEMA_VERSION = '1.0.0'

export type Severity = 'low' | 'medium' | 'high' | 'critical'
export type SignalStatus = 'new' | 'triaged' | 'investigating' | 'resolved' | 'dismissed'
export type SignalSource = 'web' | 'social' | 'internal' | 'partner' | 'api' | 'manual'
export type RiskTrend = 'up' | 'stable' | 'down'
export type IncidentStatus = 'open' | 'in_progress' | 'resolved'
export type IncidentImpact = 'user' | 'system' | 'security' | 'business'
export type TimelineEventType =
  | 'created'
  | 'updated'
  | 'assigned'
  | 'commented'
  | 'escalated'
  | 'resolved'

export interface Signal {
  id: string
  title: string
  description: string
  severity: Severity
  status: SignalStatus
  source: SignalSource
  confidence: number | null
  riskScore: number
  riskTrend?: RiskTrend
  region: string
  assignedTo: string | null
  createdAt: string
  updatedAt: string
  tags: string[]
  hasLinkedIncident: boolean
}

export interface Incident {
  id: string
  title: string
  severity: Severity
  status: IncidentStatus
  linkedSignalIds: string[]
  owner: string
  createdAt: string
  resolvedAt: string | null
  impact: IncidentImpact
}

export interface TimelineEvent {
  id: string
  signalId: string
  type: TimelineEventType
  label: string
  actor: string
  createdAt: string
}

export interface ApiError {
  code: string
  message: string
  details?: unknown
  requestId: string
}

export interface Paginated<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface SignalDetailResponse {
  signal: Signal
  linkedIncident: Incident | null
}

export interface SummaryKpi {
  label: string
  value: number
  display?: string
  trend: 'up' | 'down' | 'flat'
  trendLabel: string
}

export interface DashboardSummary {
  kpis: {
    openSignals: SummaryKpi
    criticalSignals: SummaryKpi
    activeIncidents: SummaryKpi
    avgQualificationTimeMs: SummaryKpi
  }
  severityBreakdown: { severity: Severity; count: number }[]
  signalsOverTime: { date: string; total: number; critical: number }[]
  mostCriticalSignals: Signal[]
  systemStatus: { name: string; status: 'operational' | 'degraded' | 'down' }[]
  recentIncidents: Incident[]
}

export type CompareDelta = 'good' | 'bad' | 'neutral' | 'no-change'

export interface CompareResponse {
  signalId: string
  attributes: {
    attribute: string
    before: string
    after: string
    changed: boolean
    delta: CompareDelta
  }[]
  timeline: TimelineEvent[]
  impactSentence: string
  impactMetrics: { label: string; delta: CompareDelta; value: string }[]
}

export interface DxMetric {
  variant: 'friction' | 'flow' | 'overfit'
  installTimeMs: number
  typecheckTimeMs: number
  testTimeMs: number
  buildTimeMs: number
  dockerBuildTimeMs: number
  ciDurationMs: number
  bundleSizeKb: number
  mainChunkSizeKb: number
  lighthousePerformance: number
  tableRenderTimeMs: number
  filesTouchedForAiTask: number
  testsImpacted: number
  errorReproductionSteps: number
  docsPagesNeeded: number
  aiTaskResult: 'success' | 'partial' | 'failed'
}

export interface DxMetricsResponse {
  metrics: DxMetric[]
  current: 'friction' | 'flow' | 'overfit'
  source: 'collected' | 'seed'
}

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'down'
  version: string
  variant: string
  datasetVersion: string
  uptimeSeconds: number
}

export interface SignalsQuery {
  search?: string
  severity?: Severity
  status?: SignalStatus
  source?: SignalSource
  assignedTo?: string
  riskTrend?: RiskTrend
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
}

// ---- Overfit-only technical shapes (the /ops surface) -----------------------

export interface LogRecord {
  level: string
  message: string
  requestId: string
  correlationId: string
  at: string
  fields: unknown
}

export interface SpanRecord {
  spanId: string
  parentSpanId: string | null
  name: string
  durationMs: number
  attributes: unknown
}

export interface TraceRecord {
  traceId: string
  requestId: string
  root: string
  at: string
  durationMs: number
  spans: SpanRecord[]
}

export interface MetricPoint {
  name: string
  kind: string
  value: number
  labels: unknown
}

export interface AuditEvent {
  id: string
  at: string
  actor: string
  action: string
  resource: string
  requestId: string
  correlationId: string
  redactedFields: string[]
  detail: unknown
}

export interface FeatureFlag {
  key: string
  label: string
  enabled: boolean
  owner: string
  description: string
}

export interface FeatureFlagsPayload {
  source: string
  allEnabledForParity: boolean
  flags: FeatureFlag[]
}

export interface PolicyDecision {
  policy: string
  allowed: boolean
  reason: string
  obligations: string[]
}

export interface SchemaEntry {
  method: string
  route: string
  requestSchema: string | null
  responseSchema: string
  schemaVersion: string
  ownerFeature: string
}

export interface SchemaRegistryPayload {
  registryVersion: string
  envelopeSchemaVersion: number
  entryCount: number
  entries: SchemaEntry[]
}

export interface DeepHealth {
  status: string
  variant: string
  version: string
  uptimeSeconds: number
  bootAt: string
  checks: { name: string; status: string; detail: string }[]
  datasetVolumes: { signals: number; incidents: number; timelineEvents: number }
}

export interface DependencyHealth {
  status: string
  dependencies: {
    name: string
    kind: string
    transport: string
    status: string
    latencyMs: number
  }[]
}
