import type { DashboardSummary, ServiceStatus, SummaryKpi } from '@signalops/contracts'
import { REFERENCE_NOW } from '@signalops/fixtures'
import {
  computeKpiValues,
  computeSeverityBreakdown,
  computeSignalsOverTime,
  formatDuration,
  selectMostCritical
} from '@signalops/flow-domain'
import { getIncidents, getSignals } from '../fixtures/dataset'

// Service health is a demo concern (not in the dataset); transcribed from the reference Overview.
const SYSTEM_STATUS: ServiceStatus[] = [
  { name: 'Ingestion pipeline', status: 'operational' },
  { name: 'Signal scoring', status: 'operational' },
  { name: 'Partner API connector', status: 'degraded' },
  { name: 'Notification service', status: 'operational' },
  { name: 'Export worker', status: 'down' }
]

function kpi(
  label: string,
  value: number,
  trend: SummaryKpi['trend'],
  trendLabel: string,
  display?: string
): SummaryKpi {
  return display === undefined
    ? { label, value, trend, trendLabel }
    : { label, value, display, trend, trendLabel }
}

/** Assemble the `/api/dashboard/summary` payload that feeds the Overview screen. */
export function buildDashboardSummary(): DashboardSummary {
  const signals = getSignals()
  const incidents = getIncidents()
  const { openSignals, criticalSignals, activeIncidents, avgQualificationTimeMs } =
    computeKpiValues(signals, incidents)

  const recentIncidents = [...incidents]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
    .slice(0, 5)

  return {
    kpis: {
      openSignals: kpi('Open signals', openSignals, 'up', 'vs last week'),
      criticalSignals: kpi('Critical signals', criticalSignals, 'up', 'new today'),
      activeIncidents: kpi('Active incidents', activeIncidents, 'down', 'vs yesterday'),
      avgQualificationTimeMs: kpi(
        'Avg qualification time',
        avgQualificationTimeMs,
        'down',
        'faster than avg',
        formatDuration(avgQualificationTimeMs)
      )
    },
    severityBreakdown: computeSeverityBreakdown(signals),
    signalsOverTime: computeSignalsOverTime(signals, REFERENCE_NOW, 14),
    mostCriticalSignals: selectMostCritical(signals, 8),
    systemStatus: SYSTEM_STATUS,
    recentIncidents
  }
}
