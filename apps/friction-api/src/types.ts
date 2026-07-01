// Local copy of the SignalOps product contract for the Friction backend.
// NOTE: these are duplicated by hand from the shared model so the API is self-contained.
// Keep them in sync with the frontend copy and the shared contract when the model changes.

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

export type TimelineEventType =
  | 'created'
  | 'updated'
  | 'assigned'
  | 'commented'
  | 'escalated'
  | 'resolved'

export type TimelineEvent = {
  id: string
  signalId: string
  type: TimelineEventType
  label: string
  actor: string
  createdAt: string
}

export type Analyst = {
  id: string
  name: string
  email: string
  role: 'analyst' | 'lead' | 'admin'
  region: string
}

export type Source = {
  id: string
  name: string
  category: SignalSource
  trustScore: number
}

// The canonical error envelope. Every error the API returns is supposed to look like this.
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

// Query params for /api/signals (all optional, all strings off the wire).
export type SignalsQuery = {
  search?: string
  severity?: Severity
  status?: SignalStatus
  source?: SignalSource
  assignedTo?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
  sortBy?: 'createdAt' | 'riskScore' | 'confidence' | 'severity'
  sortDirection?: 'asc' | 'desc'
}

export type ServiceStatus = {
  name: string
  status: 'operational' | 'degraded' | 'down'
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
  systemStatus: ServiceStatus[]
  recentIncidents: Incident[]
}

export type CompareDelta = 'good' | 'bad' | 'neutral' | 'no-change'

export type CompareAttribute = {
  attribute: string
  before: string
  after: string
  changed: boolean
  delta: CompareDelta
}

export type CompareResponse = {
  signalId: string
  attributes: CompareAttribute[]
  timeline: TimelineEvent[]
  impactSentence: string
  impactMetrics: { label: string; delta: CompareDelta; value: string }[]
}

// DX metric row. Duplicated shape; the numbers come from the seed table.
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

export type SignalDetailResponse = {
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
