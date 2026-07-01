/**
 * The observability event model for Flow. The shape mirrors the OpenTelemetry Log Data Model
 * (severity number, body, attributes, optional trace correlation) but stays a plain, framework-free
 * type so both the browser and the Node server can produce and read it without any SDK.
 *
 * Required: id, timestamp, level, runtime, variant, message. Everything else is optional and present
 * only when the source has it. Secrets / PII / cookies / Authorization / raw prompts / full stacks /
 * fixture dumps are NEVER stored — they are stripped by `redact` before an event reaches a store.
 */

export type FlowLogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export type FlowRuntime = 'client' | 'server' | 'api-client' | 'effect' | 'ci' | 'demo'

export const FLOW_VARIANT = 'Variant B - Flow'
export type FlowVariant = typeof FLOW_VARIANT

export type FlowBreadcrumbCategory = 'route' | 'filter' | 'request' | 'retry' | 'ui' | 'demo'

export type FlowBreadcrumb = {
  timestamp: string
  category: FlowBreadcrumbCategory
  message: string
  level?: FlowLogLevel
  data?: Record<string, unknown>
}

export type FlowLogEvent = {
  id: string
  timestamp: string
  level: FlowLogLevel
  runtime: FlowRuntime
  variant: FlowVariant
  message: string
  severityNumber?: number
  requestId?: string
  route?: string
  method?: string
  status?: number
  errorTag?: string
  errorCode?: string
  durationMs?: number
  retryCount?: number
  userAction?: string
  breadcrumbs?: FlowBreadcrumb[]
  safeContext?: Record<string, unknown>
}

/** The subset of an event a caller may supply; the logger fills id/timestamp/level/runtime/variant. */
export type FlowLogFields = Partial<
  Pick<
    FlowLogEvent,
    | 'requestId'
    | 'route'
    | 'method'
    | 'status'
    | 'errorTag'
    | 'errorCode'
    | 'durationMs'
    | 'retryCount'
    | 'userAction'
    | 'breadcrumbs'
    | 'safeContext'
  >
>

export type FlowAlertSeverity = 'critical' | 'warning' | 'product-impact' | 'demo-only'

export type FlowAlertRuleId =
  | 'spike-500'
  | 'timeouts'
  | 'validation-repeated'
  | 'product-impact-signals'
  | 'client-unhandled'
  | 'forced-demo'

export type FlowAlert = {
  id: string
  ruleId: FlowAlertRuleId
  severity: FlowAlertSeverity
  title: string
  message: string
  count: number
  firstAt: string
  lastAt: string
}

/** Operational Run counters derived from a window of events (used by the /dx-metrics Run section). */
export type RunCounters = {
  total: number
  handledErrors: number
  unhandledErrors: number
  timeouts: number
  retries: number
  /** Fraction (0..1) of events that carry a requestId. */
  requestIdCoverage: number
  alertCount: number
}

export type DiagnosticPack = {
  variant: FlowVariant
  generatedAt: string
  appVersion: string
  requestId?: string
  route?: string
  health: { status: string } | null
  demoFlags: Record<string, boolean>
  counters: RunCounters
  logs: FlowLogEvent[]
  breadcrumbs: FlowBreadcrumb[]
  userAgent?: string
  notes: string[]
}
