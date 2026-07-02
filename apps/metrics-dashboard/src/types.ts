/** Types mirroring tools/metrics/results/summary/latest.json (the collector's output). */

export type VariantId = 'flow' | 'friction' | 'overfit'
export type MetricStatus = 'ok' | 'unavailable' | 'error'
export type Direction = 'lower' | 'higher' | 'neutral' | 'balance'

export type Metric = {
  value: number | string | null
  status: MetricStatus
  reason?: string
  label: string
  unit: string | null
  direction: Direction
  category: string
  axis: string | null
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
  catalog: Record<string, CatalogEntry>
  thresholds: Record<string, number>
  variants: VariantSummary[]
  normScores: Record<string, Record<VariantId, number | null>>
  winners: Record<string, VariantId>
  notMeasured: Record<string, NotMeasuredGroup>
}
