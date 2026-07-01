import {
  BreadcrumbTimeline,
  Button,
  Card,
  CardHeader,
  ErrorInboxTable,
  OperationalAlertCard,
  PageHeader,
  RunHealthSummary,
  downloadTextFile
} from '@signalops/flow-ui'
import { buildDiagnosticPack, getDefaultStore, getDefaultTrail } from '@signalops/flow-observability'
import { getDemoControls, useHealth } from '@signalops/flow-api-client'
import { toInboxRows } from './grouping'
import { useOpsData } from './useOpsData'

/**
 * Operational health (/ops) — the Run surface. Local-first and memory-only: an error inbox, the
 * active alerts, the run-health counters and a breadcrumb timeline, all fused from the client and
 * server memory stores. The diagnostic pack is redacted on the way out.
 */
export function OpsScreen() {
  const { logs, alerts, counters, breadcrumbs, refetch } = useOpsData()
  const health = useHealth()
  const rows = toInboxRows(logs)

  const downloadPack = () => {
    const pack = buildDiagnosticPack({
      appVersion: health.data?.version ?? '0.0.0',
      route: '/ops',
      health: health.data ? { status: health.data.status } : null,
      demoFlags: { ...getDemoControls() },
      counters,
      logs,
      breadcrumbs
    })
    downloadTextFile(
      'signalops-diagnostic-pack.json',
      JSON.stringify(pack, null, 2),
      'application/json'
    )
  }

  const clearLogs = () => {
    getDefaultStore().clear()
    getDefaultTrail().clear()
    refetch()
  }

  return (
    <div className="so-page">
      <PageHeader
        title="Operational health"
        subtitle="Local-first error inbox, alerts and diagnostics for the Flow demo. Memory-only, no persistence."
        actions={
          <>
            <Button variant="secondary" onClick={downloadPack}>
              Download diagnostic pack
            </Button>
            <Button variant="secondary" onClick={clearLogs}>
              Clear demo logs
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader
          title="Run health"
          subtitle="Derived from the in-memory event store (demo + live)."
        />
        <RunHealthSummary counters={counters} />
      </Card>

      <Card>
        <CardHeader title="Alerts" subtitle="Window-based rules over recent events." />
        <div role="region" aria-live="polite" aria-label="Operational alerts">
          {alerts.length === 0 ? (
            <p>No active alerts.</p>
          ) : (
            alerts.map((alert) => <OperationalAlertCard key={alert.id} alert={alert} />)
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Error inbox"
          subtitle="Grouped by error tag, route and status. Copy a request id to correlate with the server logs."
        />
        <ErrorInboxTable rows={rows} />
      </Card>

      <Card>
        <CardHeader title="Breadcrumbs" subtitle="Recent client actions leading up to now." />
        <BreadcrumbTimeline items={breadcrumbs} />
      </Card>
    </div>
  )
}
