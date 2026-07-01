/**
 * Plain prop types for the Ops surface components. Declared locally (not imported from
 * `@signalops/flow-observability`) so `@signalops/flow-ui` stays data-agnostic and never depends on
 * the observability runtime. `feature-ops` maps observability events onto these props.
 */
export type OpsLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'
export type OpsAlertSeverity = 'critical' | 'warning' | 'product-impact' | 'demo-only'

export type OpsLogRow = {
  id: string
  level: OpsLevel
  message: string
  route?: string
  method?: string
  status?: number
  errorTag?: string
  requestId?: string
  count: number
  firstAt: string
  lastAt: string
}

export type OpsAlert = {
  id: string
  severity: OpsAlertSeverity
  title: string
  message: string
  count: number
}

export type OpsCounters = {
  total: number
  handledErrors: number
  unhandledErrors: number
  timeouts: number
  retries: number
  requestIdCoverage: number
  alertCount: number
}

export type OpsBreadcrumb = {
  timestamp: string
  category: string
  message: string
  level?: OpsLevel
}
