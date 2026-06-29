import { useMutation, useQuery } from '@tanstack/react-query'
import {
  API_ROUTES,
  type CompareResponse,
  type DashboardSummary,
  type DxMetricsResponse,
  type HealthResponse,
  type Incident,
  type IncidentsQuery,
  type Paginated,
  type Signal,
  type SignalDetailResponse,
  type SignalsQuery,
  type TimelineEvent
} from '@signalops/contracts'
import { apiGet, apiPost, toQueryString } from './client'

/** Centralized query keys so cache invalidation and devtools stay legible. */
export const queryKeys = {
  health: ['health'] as const,
  dashboard: ['dashboard', 'summary'] as const,
  signals: (query: SignalsQuery) => ['signals', query] as const,
  signal: (id: string) => ['signals', id] as const,
  signalEvents: (id: string) => ['signals', id, 'events'] as const,
  incidents: (query: IncidentsQuery) => ['incidents', query] as const,
  compare: (id: string) => ['compare', id] as const,
  dxMetrics: ['dx-metrics'] as const
}

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: () => apiGet<HealthResponse>(API_ROUTES.health)
  })
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => apiGet<DashboardSummary>(API_ROUTES.dashboardSummary),
    staleTime: 60_000
  })
}

export function useSignals(query: SignalsQuery) {
  return useQuery({
    queryKey: queryKeys.signals(query),
    queryFn: () =>
      apiGet<Paginated<Signal>>(
        `${API_ROUTES.signals}${toQueryString(query as Record<string, string | number | undefined>)}`
      )
  })
}

export function useSignalDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.signal(id),
    queryFn: () => apiGet<SignalDetailResponse>(API_ROUTES.signalById(id))
  })
}

export function useSignalEvents(id: string) {
  return useQuery({
    queryKey: queryKeys.signalEvents(id),
    queryFn: () => apiGet<TimelineEvent[]>(API_ROUTES.signalEvents(id))
  })
}

export function useIncidents(query: IncidentsQuery) {
  return useQuery({
    queryKey: queryKeys.incidents(query),
    queryFn: () =>
      apiGet<Paginated<Incident>>(
        `${API_ROUTES.incidents}${toQueryString(query as Record<string, string | number | undefined>)}`
      )
  })
}

/**
 * Fetch every incident (the dataset has 300; the API caps pages at 200, so this pages through).
 * The Incidents screen is small enough to filter and summarize fully client-side.
 */
export function useAllIncidents() {
  return useQuery({
    queryKey: ['incidents', 'all'] as const,
    queryFn: async () => {
      const first = await apiGet<Paginated<Incident>>(`${API_ROUTES.incidents}?page=1&pageSize=200`)
      const restPages = Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) => i + 2)
      const rest = await Promise.all(
        restPages.map((page) =>
          apiGet<Paginated<Incident>>(`${API_ROUTES.incidents}?page=${page}&pageSize=200`)
        )
      )
      return [first, ...rest].flatMap((p) => p.items)
    },
    staleTime: 60_000
  })
}

export function useCompare(id: string) {
  return useQuery({
    queryKey: queryKeys.compare(id),
    queryFn: () => apiGet<CompareResponse>(API_ROUTES.compareById(id)),
    enabled: id.length > 0
  })
}

export function useDxMetrics() {
  return useQuery({
    queryKey: queryKeys.dxMetrics,
    queryFn: () => apiGet<DxMetricsResponse>(API_ROUTES.dxMetrics),
    staleTime: 60_000
  })
}

/** Demo control: POST /api/simulate-error always returns the canonical ApiError envelope. */
export function useSimulateError() {
  return useMutation({ mutationFn: () => apiPost<never>(API_ROUTES.simulateError) })
}
