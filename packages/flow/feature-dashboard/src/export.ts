import type { DashboardSummary } from '@signalops/contracts'

/**
 * Export the dashboard's KPIs + most-critical signals as JSON. Pure (no DOM) so it is unit
 * testable; the screen wires it to a file download.
 */
export function dashboardToJson(summary: DashboardSummary): string {
  return JSON.stringify(
    {
      kpis: summary.kpis,
      mostCriticalSignals: summary.mostCriticalSignals.map((s) => ({
        id: s.id,
        title: s.title,
        severity: s.severity,
        source: s.source,
        riskScore: s.riskScore
      })),
      recentIncidents: summary.recentIncidents.map((i) => ({
        id: i.id,
        title: i.title,
        severity: i.severity,
        owner: i.owner
      }))
    },
    null,
    2
  )
}
