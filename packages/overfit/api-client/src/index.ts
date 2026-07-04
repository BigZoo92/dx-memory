//! Overfit typed API client. The single place the frontend is allowed to talk HTTP. Every feature
//! package depends on this, never on `fetch` directly. It propagates a client request id, normalizes
//! any failure into the `ApiError` envelope, and runs the generated runtime validators on reads.

import type {
  ApiError,
  AuditEvent,
  CompareResponse,
  DashboardSummary,
  DeepHealth,
  DependencyHealth,
  DxMetricsResponse,
  FeatureFlagsPayload,
  HealthResponse,
  Incident,
  LogRecord,
  MetricPoint,
  Paginated,
  PolicyDecision,
  SchemaRegistryPayload,
  Signal,
  SignalDetailResponse,
  SignalsQuery,
  TimelineEvent,
  TraceRecord
} from '@signalops/overfit-contracts-generated'
import { assertPaginatedSignals } from '@signalops/overfit-contracts-generated/runtime'

export interface IncidentsQuery {
  status?: string
  severity?: string
  impact?: string
  page?: number
  pageSize?: number
}

export interface ClientOptions {
  /** Base URL. Defaults to `/api` (Next rewrites proxy this to the Rust backend). */
  baseUrl?: string
  fetchImpl?: typeof fetch
}

function defaultBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_OVERFIT_API_BASE ?? '/api').replace(/\/+$/, '')
}

let clientRequestCounter = 0
function nextClientRequestId(): string {
  clientRequestCounter += 1
  return `web_${clientRequestCounter.toString(16).padStart(6, '0')}`
}

function isApiError(v: unknown): v is ApiError {
  return typeof v === 'object' && v !== null && 'code' in v && 'message' in v
}

export class OverfitApiClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(opts: ClientOptions = {}) {
    this.baseUrl = opts.baseUrl ?? defaultBaseUrl()
    // Never store a bare reference to `globalThis.fetch`: called as `this.fetchImpl(...)` it would
    // lose its binding to `window` and throw "Illegal invocation". Wrap it so the browser always
    // receives `fetch` invoked with the correct receiver.
    this.fetchImpl = opts.fetchImpl ?? ((input, init) => globalThis.fetch(input, init))
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const clientRequestId = nextClientRequestId()
    let res: Response
    try {
      res = await this.fetchImpl(this.baseUrl + path, {
        ...init,
        headers: {
          'content-type': 'application/json',
          'x-overfit-client-request-id': clientRequestId,
          ...init?.headers
        }
      })
    } catch (cause) {
      throw normalizeError(cause, clientRequestId)
    }
    if (!res.ok) {
      let body: unknown = null
      try {
        body = await res.json()
      } catch {
        body = null
      }
      throw isApiError(body)
        ? body
        : ({
            code: 'network_error',
            message: `Request failed with status ${res.status}`,
            requestId: clientRequestId
          } satisfies ApiError)
    }
    return (await res.json()) as T
  }

  // ---- required product endpoints ----
  async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health')
  }

  async listSignals(query: SignalsQuery = {}): Promise<Paginated<Signal>> {
    const page = await this.request<Paginated<Signal>>('/signals' + toQueryString(query))
    // Client-side runtime validation (double-checking the typed response).
    return assertPaginatedSignals(page)
  }

  async getSignal(id: string): Promise<SignalDetailResponse> {
    return this.request<SignalDetailResponse>(`/signals/${encodeURIComponent(id)}`)
  }

  async getSignalEvents(id: string): Promise<TimelineEvent[]> {
    return this.request<TimelineEvent[]>(`/signals/${encodeURIComponent(id)}/events`)
  }

  async listIncidents(query: IncidentsQuery = {}): Promise<Paginated<Incident>> {
    return this.request<Paginated<Incident>>('/incidents' + toQueryString(query))
  }

  async getDashboardSummary(): Promise<DashboardSummary> {
    return this.request<DashboardSummary>('/dashboard/summary')
  }

  async getCompare(id: string): Promise<CompareResponse> {
    return this.request<CompareResponse>(`/compare/${encodeURIComponent(id)}`)
  }

  async getDxMetrics(): Promise<DxMetricsResponse> {
    return this.request<DxMetricsResponse>('/dx-metrics')
  }

  async simulateError(): Promise<never> {
    await this.request('/simulate-error', { method: 'POST', body: '{}' })
    throw new Error('unreachable: simulate-error always fails')
  }

  // ---- logs + technical / ops endpoints ----
  async getLogs(): Promise<LogRecord[]> {
    return this.request<LogRecord[]>('/logs')
  }

  async postLog(entry: {
    level?: string
    message: string
    fields?: unknown
  }): Promise<{ accepted: boolean; requestId: string }> {
    return this.request('/logs', { method: 'POST', body: JSON.stringify(entry) })
  }

  async getHealthDeep(): Promise<DeepHealth> {
    return this.request<DeepHealth>('/health/deep')
  }

  async getHealthDependencies(): Promise<DependencyHealth> {
    return this.request<DependencyHealth>('/health/dependencies')
  }

  async getTraces(): Promise<TraceRecord[]> {
    return this.request<TraceRecord[]>('/telemetry/traces')
  }

  async getMetrics(): Promise<MetricPoint[]> {
    return this.request<MetricPoint[]>('/telemetry/metrics')
  }

  async getAuditEvents(): Promise<AuditEvent[]> {
    return this.request<AuditEvent[]>('/audit-events')
  }

  async getSchemaRegistry(): Promise<SchemaRegistryPayload> {
    return this.request<SchemaRegistryPayload>('/schema-registry')
  }

  async getFeatureFlags(): Promise<FeatureFlagsPayload> {
    return this.request<FeatureFlagsPayload>('/feature-flags')
  }

  async checkPolicy(policy: string, input: unknown): Promise<PolicyDecision> {
    return this.request<PolicyDecision>('/policy/check', {
      method: 'POST',
      body: JSON.stringify({ policy, input })
    })
  }

  async getDiagnosticPack(): Promise<unknown> {
    return this.request<unknown>('/diagnostic-pack')
  }
}

export function normalizeError(cause: unknown, requestId: string): ApiError {
  if (isApiError(cause)) return cause
  const message = cause instanceof Error ? cause.message : 'Unknown network error'
  return { code: 'network_error', message, requestId }
}

function toQueryString(query: object): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value))
    }
  }
  const s = params.toString()
  return s ? `?${s}` : ''
}

/** Convenience singleton for the browser (same-origin `/api`). */
export const overfitApi = new OverfitApiClient()
