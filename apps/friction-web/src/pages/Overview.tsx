import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet } from '../api'
import type { ApiError, DashboardSummary, Severity } from '../types'
import { formatSeverity } from '../helpers'
import {
  Card,
  KpiCard,
  SeverityBadge,
  ErrorState,
  SkeletonRows,
  StatusDot,
  IncidentStatusBadge
} from '../components'

function sevColor(s: Severity): string {
  return s === 'critical'
    ? 'var(--so-red-fg)'
    : s === 'high'
      ? 'var(--so-accent)'
      : s === 'medium'
        ? 'var(--so-amber-fg)'
        : 'var(--so-blue-fg)'
}

export function Overview() {
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    setError(null)
    apiGet<DashboardSummary>('/dashboard/summary')
      .then((d) => setData(d))
      .catch((e) => setError(e))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  if (loading) return <SkeletonRows rows={8} />
  if (error || !data) return <ErrorState error={error} onRetry={load} />

  const maxSev = Math.max(1, ...data.severityBreakdown.map((s) => s.count))
  const maxTs = Math.max(1, ...data.signalsOverTime.map((p) => p.total))

  return (
    <div className="page">
      <div className="pageHead">
        <div>
          <h1 className="pageTitle">Overview</h1>
          <p className="pageSubtitle">Prioritize what matters first.</p>
        </div>
        <div className="row">
          <select className="select" aria-label="Date range" defaultValue="14">
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
          </select>
          <button
            className="btn btn-secondary"
            onClick={() => {
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'overview.json'
              a.click()
              URL.revokeObjectURL(url)
            }}
          >
            Export
          </button>
        </div>
      </div>

      <div className="grid-kpis">
        <KpiCard kpi={data.kpis.openSignals} />
        <KpiCard kpi={data.kpis.criticalSignals} />
        <KpiCard kpi={data.kpis.activeIncidents} />
        <KpiCard kpi={data.kpis.avgQualificationTimeMs} />
      </div>

      <div className="grid-2">
        <Card title="Signals by severity">
          <div className="sevBars">
            {data.severityBreakdown.map((row) => (
              <div key={row.severity} className="sevBarRow">
                <span>{formatSeverity(row.severity)}</span>
                <div className="sevBarTrack">
                  <div
                    className="sevBarFill"
                    style={{
                      width: `${(row.count / maxSev) * 100}%`,
                      background: sevColor(row.severity)
                    }}
                  />
                </div>
                <span className="mono">{row.count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Signals over time">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 }}>
            {data.signalsOverTime.map((p) => (
              <div
                key={p.date}
                title={`${p.date}: ${p.total} total, ${p.critical} critical`}
                style={{
                  flex: 1,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  gap: 0
                }}
              >
                <div
                  style={{
                    height: `${(Math.max(0, p.total - p.critical) / maxTs) * 100}%`,
                    background: 'var(--so-accent-tint-100)',
                    borderRadius: '3px 3px 0 0'
                  }}
                />
                <div
                  style={{
                    height: `${(p.critical / maxTs) * 100}%`,
                    background: 'var(--so-accent)'
                  }}
                />
              </div>
            ))}
          </div>
          <div
            className="row"
            style={{ marginTop: 10, fontSize: 12, color: 'var(--so-slate-500)' }}
          >
            <span>
              <span
                style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  background: 'var(--so-accent-tint-100)',
                  borderRadius: 3,
                  marginRight: 6
                }}
              />
              All signals
            </span>
            <span>
              <span
                style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  background: 'var(--so-accent)',
                  borderRadius: 3,
                  marginRight: 6
                }}
              />
              Critical
            </span>
          </div>
        </Card>
      </div>

      <div className="grid-overview">
        <Card title="Most critical signals">
          <div className="list">
            {data.mostCriticalSignals.map((s) => (
              <div key={s.id} className="listRow">
                <div className="row" style={{ gap: 10 }}>
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: '50%',
                      background: sevColor(s.severity)
                    }}
                  />
                  <div>
                    <Link to={`/signals/${s.id}`} className="cellTitle">
                      {s.title}
                    </Link>
                    <div className="cellSub">
                      {s.id} · {s.source} · {new Date(s.createdAt).toISOString().slice(0, 10)}
                    </div>
                  </div>
                </div>
                <div className="row" style={{ gap: 10 }}>
                  <SeverityBadge severity={s.severity} />
                  <span className="mono">{s.riskScore}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="stack">
          <Card title="System status">
            <div className="list">
              {data.systemStatus.map((svc) => (
                <div key={svc.name} className="listRow">
                  <span>{svc.name}</span>
                  <span className="row" style={{ gap: 7 }}>
                    <StatusDot tone={svc.status} />
                    <span className="muted" style={{ textTransform: 'capitalize' }}>
                      {svc.status}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <div className="aiCard">
            <span className="aiTag">AI · mock</span>
            <p style={{ margin: '10px 0' }}>
              3 critical signals share the same partner source. Consider grouping them into one
              incident and escalating.
            </p>
            <div className="row">
              <button className="btn btn-primary btn-sm">Group signals</button>
              <button className="btn btn-secondary btn-sm">Dismiss</button>
            </div>
          </div>
        </div>
      </div>

      <Card title="Recent incidents" flush>
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Incident</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Impact</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              {data.recentIncidents.map((inc) => (
                <tr key={inc.id}>
                  <td>
                    <div className="cellTitle">{inc.title}</div>
                    <div className="cellSub">{inc.id}</div>
                  </td>
                  <td>
                    <SeverityBadge severity={inc.severity} />
                  </td>
                  <td>
                    <IncidentStatusBadge status={inc.status} />
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{inc.impact}</td>
                  <td className="mono">{inc.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
