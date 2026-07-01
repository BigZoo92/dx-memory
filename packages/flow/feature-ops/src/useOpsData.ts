import { useSyncExternalStore } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@signalops/flow-api-client'
import {
  computeRunCounters,
  evaluateAlerts,
  getDefaultStore,
  getDefaultTrail,
  type FlowAlert,
  type FlowBreadcrumb,
  type FlowLogEvent,
  type RunCounters
} from '@signalops/flow-observability'

function useClientLogs(): readonly FlowLogEvent[] {
  const store = getDefaultStore()
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

function useClientBreadcrumbs(): readonly FlowBreadcrumb[] {
  const trail = getDefaultTrail()
  return useSyncExternalStore(trail.subscribe, trail.getSnapshot, trail.getSnapshot)
}

export type OpsData = {
  logs: FlowLogEvent[]
  alerts: FlowAlert[]
  counters: RunCounters
  breadcrumbs: readonly FlowBreadcrumb[]
  isLoading: boolean
  refetch: () => void
}

/**
 * Fuse the two memory stores into one view: the server store (read over `/api/logs`) and the client
 * store (read directly via `useSyncExternalStore`), deduplicated by id. Alerts and run counters are
 * recomputed from the merged snapshot on every render (pure, cheap).
 */
export function useOpsData(): OpsData {
  const serverQuery = useQuery({
    queryKey: ['ops', 'logs'],
    queryFn: ({ signal }) => apiGet<{ logs: FlowLogEvent[] }>('/api/logs', { signal }),
    refetchInterval: 5000
  })
  const clientLogs = useClientLogs()
  const breadcrumbs = useClientBreadcrumbs()

  const byId = new Map<string, FlowLogEvent>()
  for (const event of serverQuery.data?.logs ?? []) byId.set(event.id, event)
  for (const event of clientLogs) byId.set(event.id, event)
  const logs = [...byId.values()].sort((a, b) => b.timestamp.localeCompare(a.timestamp))

  const alerts = evaluateAlerts(logs, Date.now())
  const counters = computeRunCounters(logs, alerts.length)

  return {
    logs,
    alerts,
    counters,
    breadcrumbs,
    isLoading: serverQuery.isPending,
    refetch: () => {
      void serverQuery.refetch()
    }
  }
}
