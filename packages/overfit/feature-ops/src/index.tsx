'use client'

import { useEffect, useState } from 'react'
import type {
  AuditEvent,
  DeepHealth,
  DependencyHealth,
  FeatureFlagsPayload,
  HealthResponse,
  LogRecord,
  MetricPoint,
  PolicyDecision,
  SchemaRegistryPayload,
  TraceRecord
} from '@signalops/overfit-contracts-generated'
import { overfitApi } from '@signalops/overfit-api-client'
import { Card, SkeletonRows, StatusDot } from '@signalops/overfit-ui'

export function OpsPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [deep, setDeep] = useState<DeepHealth | null>(null)
  const [deps, setDeps] = useState<DependencyHealth | null>(null)
  const [logs, setLogs] = useState<LogRecord[]>([])
  const [traces, setTraces] = useState<TraceRecord[]>([])
  const [metrics, setMetrics] = useState<MetricPoint[]>([])
  const [audit, setAudit] = useState<AuditEvent[]>([])
  const [registry, setRegistry] = useState<SchemaRegistryPayload | null>(null)
  const [flags, setFlags] = useState<FeatureFlagsPayload | null>(null)
  const [policy, setPolicy] = useState<PolicyDecision | null>(null)
  const [loading, setLoading] = useState(true)
  const [packStatus, setPackStatus] = useState<string | null>(null)

  function refresh() {
    setLoading(true)
    Promise.allSettled([
      overfitApi.getHealth().then(setHealth),
      overfitApi.getHealthDeep().then(setDeep),
      overfitApi.getHealthDependencies().then(setDeps),
      overfitApi.getLogs().then(setLogs),
      overfitApi.getTraces().then(setTraces),
      overfitApi.getMetrics().then(setMetrics),
      overfitApi.getAuditEvents().then(setAudit),
      overfitApi.getSchemaRegistry().then(setRegistry),
      overfitApi.getFeatureFlags().then(setFlags),
      overfitApi.checkPolicy('route_access', { method: 'GET', route: '/api/signals' }).then(setPolicy)
    ]).finally(() => setLoading(false))
  }

  useEffect(() => {
    refresh()
  }, [])

  async function downloadPack() {
    setPackStatus('Generating diagnostic pack…')
    try {
      const pack = await overfitApi.getDiagnosticPack()
      const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'overfit-diagnostic-pack.json'
      a.click()
      URL.revokeObjectURL(url)
      setPackStatus('Diagnostic pack downloaded.')
    } catch {
      setPackStatus('Failed to generate diagnostic pack.')
    }
  }

  return (
    <div className="page">
      <div className="pageHead">
        <div>
          <h1 className="pageTitle">Operational health</h1>
          <p className="pageSubtitle">Health, telemetry, audit, schema registry, policies and diagnostics.</p>
        </div>
        <div className="row">
          <button className="btn btn-secondary" onClick={refresh}>
            Refresh
          </button>
          <button className="btn btn-primary" onClick={downloadPack}>
            Export diagnostic pack
          </button>
        </div>
      </div>

      {packStatus && <div className="banner banner-ok">{packStatus}</div>}

      {loading && !health ? (
        <SkeletonRows rows={8} />
      ) : (
        <>
          <div className="grid-3">
            <Card title="Health">
              <dl className="kv">
                <dt>API</dt>
                <dd>
                  <StatusDot tone={health ? 'ok' : 'down'} /> {health?.status ?? 'unreachable'}
                </dd>
                <dt>Version</dt>
                <dd>{health?.version ?? '—'}</dd>
                <dt>Variant</dt>
                <dd>{health?.variant ?? '—'}</dd>
                <dt>Uptime</dt>
                <dd>{health ? `${health.uptimeSeconds}s` : '—'}</dd>
              </dl>
            </Card>

            <Card title="Deep health">
              <div className="list">
                {(deep?.checks ?? []).map((c) => (
                  <div key={c.name} className="listRow">
                    <span>{c.name}</span>
                    <span className="row" style={{ gap: 7 }}>
                      <StatusDot tone={c.status === 'ok' ? 'ok' : 'down'} />
                      <span className="muted">{c.detail}</span>
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Dependencies">
              <div className="list">
                {(deps?.dependencies ?? []).map((d) => (
                  <div key={d.name} className="listRow">
                    <span>
                      {d.name} <span className="muted">· {d.kind}</span>
                    </span>
                    <span className="row" style={{ gap: 7 }}>
                      <StatusDot tone={d.status === 'operational' ? 'ok' : 'down'} />
                      <span className="muted mono">{(d.latencyMs ?? 0).toFixed(2)}ms</span>
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card title={`Request logs (${logs.length})`}>
            <div>
              {logs.length === 0 ? (
                <div className="muted">No logs yet.</div>
              ) : (
                logs
                  .slice(-40)
                  .reverse()
                  .map((l, i) => (
                    <div key={i} className="logLine">
                      <span className="muted">{l.at.slice(11, 23)}</span>
                      <span className={l.level === 'error' ? 'delta-bad' : 'muted'}>{l.level}</span>
                      <span>
                        {l.message} <span className="muted">· {l.requestId}</span>
                      </span>
                    </div>
                  ))
              )}
            </div>
          </Card>

          <div className="grid-2">
            <Card title={`Traces (${traces.length})`} flush>
              <div className="tableWrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Trace</th>
                      <th>Root</th>
                      <th>Spans</th>
                      <th>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {traces
                      .slice(-12)
                      .reverse()
                      .map((t) => (
                        <tr key={t.traceId}>
                          <td className="mono">{t.traceId}</td>
                          <td>{t.root}</td>
                          <td className="mono">{t.spans?.length ?? 0}</td>
                          <td className="mono">{(t.durationMs ?? 0).toFixed(2)}ms</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title={`Metrics (${metrics.length})`} flush>
              <div className="tableWrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Kind</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map((m) => (
                      <tr key={m.name}>
                        <td className="mono">{m.name}</td>
                        <td>{m.kind}</td>
                        <td className="mono">{m.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <Card title={`Audit events (${audit.length})`} flush>
            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Action</th>
                    <th>Resource</th>
                    <th>Actor</th>
                    <th>Request</th>
                    <th>Redacted</th>
                  </tr>
                </thead>
                <tbody>
                  {audit
                    .slice(-15)
                    .reverse()
                    .map((a) => (
                      <tr key={a.id}>
                        <td className="mono">{a.id}</td>
                        <td>{a.action}</td>
                        <td className="mono">{a.resource}</td>
                        <td>{a.actor}</td>
                        <td className="mono muted">{a.requestId}</td>
                        <td>{a.redactedFields.length}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid-2">
            <Card title="Schema registry">
              <dl className="kv">
                <dt>Registry version</dt>
                <dd>{registry?.registryVersion ?? '—'}</dd>
                <dt>Envelope schema</dt>
                <dd>v{registry?.envelopeSchemaVersion ?? '—'}</dd>
                <dt>Entries</dt>
                <dd>{registry?.entryCount ?? 0}</dd>
              </dl>
              <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                {(registry?.entries ?? []).length} endpoints registered with request/response schema versions.
              </div>
            </Card>

            <Card title="Feature flags">
              <div className="list">
                {(flags?.flags ?? []).map((f) => (
                  <div key={f.key} className="listRow">
                    <span>
                      {f.label} <span className="muted mono">· {f.key}</span>
                    </span>
                    <span className={f.enabled ? 'delta-good' : 'delta-bad'}>{f.enabled ? 'on' : 'off'}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card title="Policy check">
            <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
              route_access(GET /api/signals)
            </div>
            {policy ? (
              <dl className="kv">
                <dt>Policy</dt>
                <dd>{policy.policy}</dd>
                <dt>Allowed</dt>
                <dd className={policy.allowed ? 'delta-good' : 'delta-bad'}>{String(policy.allowed)}</dd>
                <dt>Reason</dt>
                <dd>{policy.reason}</dd>
                <dt>Obligations</dt>
                <dd>{policy.obligations.length ? policy.obligations.join(', ') : '—'}</dd>
              </dl>
            ) : (
              <div className="muted">No decision.</div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
