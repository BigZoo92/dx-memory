/** Types mirroring tools/metrics/results/summary/latest.json (the collector's output). */

export type VariantId = 'flow' | 'friction' | 'overfit'
export type MetricStatus = 'ok' | 'unavailable' | 'error'
export type Direction = 'lower' | 'higher' | 'neutral' | 'balance'

export type MetricScope = 'variant' | 'repo'

export type Metric = {
  value: number | string | null
  status: MetricStatus
  reason?: string
  label: string
  unit: string | null
  direction: Direction
  category: string
  axis: string | null
  scope?: MetricScope
  description: string | null
  command?: string
}

export type ScoreEntry = {
  label: string
  kind: 'axis' | 'derived' | 'headline'
  value: number | null
  coverage?: string
  coverageFrac?: number
  complete?: boolean
  gated?: boolean
  method?: string
  axesUsed?: string[]
}

export type GraphNode = {
  id: string
  short: string
  dir: string
  kind: 'npm' | 'rust'
  fanIn: number
  fanOut: number
}
export type GraphEdge = { source: string; target: string }
export type VariantGraph = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  central: { name: string; fanIn: number }[]
  isolated: string[]
}

export type Meta = {
  app: string
  variant: VariantId
  label: string
  thesis: string
  stack: string
  accent: string
  commit: string | null
  commitShort: string | null
  branch: string | null
  timestamp: string
  environment: string | null
  appUrl: string | null
  apiUrl: string | null
}

export type Chunk = { name: string; kb: number; gzipKb: number }

export type VariantSummary = {
  meta: Meta
  metrics: Record<string, Metric>
  graph: VariantGraph
  topChunks: Chunk[]
  scores: Record<string, ScoreEntry>
  statuses: { ok: number; unavailable: number; error: number }
}

export type CatalogEntry = {
  label: string
  category: string
  axis: string
  unit: string
  direction: Direction
  collector: string
  description: string
}

export type ScoreGroup = { label: string; kind: string; members: Record<string, number> }

export type NotMeasuredGroup = {
  status: string
  reason: string
  seam: string
  metrics: Record<string, Metric>
}

/* ------------------------------------------------- GitHub delivery pipeline ---- */
export type GithubStatus = 'ok' | 'unavailable' | 'error'

export type GithubSource = {
  status: GithubStatus
  repository: string | null
  tokenSource?: string | null
  runLimit: number
  prLimit: number
  workflows: string[]
  requestCount?: number
  rateLimitRemaining?: number | null
  notes?: string[]
  reason?: string
  collectedAt: string
}

export type GithubRun = {
  id: number
  name: string | null
  workflow: string | null
  kind: 'ci' | 'deploy' | 'metrics' | 'other'
  event: string
  status: string
  conclusion: string | null
  runNumber: number
  branch: string | null
  createdAt: string
  runStartedAt: string | null
  updatedAt: string
  wallTimeMs: number | null
  queueTimeMs: number | null
  htmlUrl: string
}

export type GithubJobStat = {
  name: string
  runsCount: number
  avgDurationMs: number | null
  medianDurationMs: number | null
  p95DurationMs: number | null
  maxDurationMs: number | null
  successRate: number | null
  failureCount: number
  failureRate: number | null
  latestConclusion: string | null
}

export type GithubHeatmapRun = {
  runNumber: number
  jobs: { name: string; conclusion: string | null; durationMs: number | null }[]
}

export type GithubPr = {
  number: number
  title: string
  htmlUrl: string
  mergedAt: string | null
  changedFiles: number | null
  additions: number | null
  deletions: number | null
  reviewCount: number | null
  reviewComments: number | null
  timeToMergeMs: number | null
  touched: Record<string, number> | null
}

export type GithubRaw = {
  runs: GithubRun[]
  runsSummary: {
    count: number
    completedCount: number
    successCount: number
    failureCount: number
    cancelledCount: number
    skippedCount: number
    successRate: number | null
    wallTime: { latestMs: number | null; avgMs: number | null; medianMs: number | null; p95Ms: number | null }
    queueTime: { avgMs: number | null }
    latestRun: { status: string; conclusion: string | null; htmlUrl: string; runNumber: number } | null
    truncated?: boolean
  } | null
  jobs: {
    queriedRuns: number
    count: number
    byName: GithubJobStat[]
    slowestJob: { name: string; durationMs: number | null } | null
    avgDurationMs?: number | null
    maxDurationMs?: number | null
    heatmap: GithubHeatmapRun[]
    note?: string
  }
  flakyProxy: { unstableJobsCount: number; unstableJobs: { name: string; failureRate: number | null; runsCount: number }[]; rate: number | null; method?: string }
  artifacts: {
    count: number
    totalSizeBytes: number
    avgSizeBytes: number
    metricsArtifactsCount: number
    dashboardArtifactsCount: number
    latest: { name: string; sizeBytes: number; createdAt: string }[]
    note?: string
  }
  pullRequests: {
    count: number
    mergedCount: number
    detailed: number
    list: GithubPr[]
    buckets: Record<string, number> | null
    avgChangedFiles?: number | null
    medianChangedFiles?: number | null
    avgAdditions?: number | null
    avgDeletions?: number | null
    avgReviewCount?: number | null
    avgReviewComments?: number | null
    avgTimeToMergeMs?: number | null
    medianTimeToMergeMs?: number | null
    note?: string
  }
  deploy: {
    source: 'deployments_api' | 'actions_jobs' | 'unavailable'
    reason?: string
    latestStatus: string | null
    latestDurationMs: number | null
    avgDurationMs: number | null
    successRateLastN: number | null
    deployments: { id: number; environment?: string; ref?: string; createdAt: string; state: string | null; durationMs: number | null }[]
  }
} | null

export type HistoryPoint = {
  at: string
  commit: string | null
  totalDeliveryScore: Record<VariantId, number | null>
  shipScore: Record<VariantId, number | null>
  ciWallTimeMs: number | null
  flowBundleGzipKb: number | null
}

export type Summary = {
  generatedAt: string
  collectorVersion: string
  source: string
  withTimings: boolean
  commit: string | null
  commitShort: string | null
  branch: string | null
  environment: string | null
  axisWeights: Record<string, number | string>
  scoreGroups: Record<string, ScoreGroup>
  catalog: Record<string, CatalogEntry & { scope?: string }>
  thresholds: Record<string, number>
  variants: VariantSummary[]
  normScores: Record<string, Record<VariantId, number | null>>
  winners: Record<string, VariantId>
  notMeasured: Record<string, NotMeasuredGroup>
  sources: { github: GithubSource }
  githubMetrics: Record<string, Metric>
  github: GithubRaw
  history: HistoryPoint[]
}
