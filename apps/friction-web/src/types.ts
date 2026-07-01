// Local copy of the product types for the web app. Yes, these are also defined in the backend
// and in the shared contract package - we keep our own copy so the frontend is self-contained.

export type Severity = 'low' | 'medium' | 'high' | 'critical'
export type SignalStatus = 'new' | 'triaged' | 'investigating' | 'resolved' | 'dismissed'
export type SignalSource = 'web' | 'social' | 'internal' | 'partner' | 'api' | 'manual'

export type Signal = {
  id: string
  title: string
  description: string
  severity: Severity
  status: SignalStatus
  source: SignalSource
  confidence: number | null
  riskScore: number
  riskTrend?: 'up' | 'stable' | 'down'
  region: string
  assignedTo: string | null
  createdAt: string
  updatedAt: string
  tags: string[]
  hasLinkedIncident: boolean
}

export type IncidentStatus = 'open' | 'in_progress' | 'resolved'
export type IncidentImpact = 'user' | 'system' | 'security' | 'business'

export type Incident = {
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

export type TimelineEvent = {
  id: string
  signalId: string
  type: 'created' | 'updated' | 'assigned' | 'commented' | 'escalated' | 'resolved'
  label: string
  actor: string
  createdAt: string
}

export type ApiError = {
  code: string
  message: string
  details?: unknown
  requestId: string
}

export type Paginated<T> = {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type SummaryKpi = {
  label: string
  value: number
  display?: string
  trend: 'up' | 'down' | 'flat'
  trendLabel: string
}

export type DashboardSummary = {
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

export type CompareResponse = {
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

export type DxMetric = {
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

export type DxMetricsResponse = {
  metrics: DxMetric[]
  current: 'friction' | 'flow' | 'overfit'
  source: 'collected' | 'seed'
}

export type SignalDetail = {
  signal: Signal
  linkedIncident: Incident | null
}

export type HealthResponse = {
  status: 'ok' | 'degraded' | 'down'
  version: string
  variant: string
  datasetVersion: string
  uptimeSeconds: number
}
