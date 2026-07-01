import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet } from '../api'
import type { ApiError, Incident, Paginated } from '../types'
import { ageSince, formatDuration } from '../helpers'
import { IMPACTS, SEVERITIES, INCIDENT_STATUSES } from '../constants'
import {
  Card,
  KpiCard,
  SeverityBadge,
  ImpactBadge,
  IncidentStatusBadge,
  ErrorState,
  SkeletonRows,
  EmptyState
} from '../components'

// Reference "now" for age calculations. Duplicated from the dataset seed.
const REFERENCE_NOW = Date.parse('2026-06-29T12:00:00.000Z')
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export function Incidents() {
  const [all, setAll] = useState<Incident[]>([])
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [severity, setSeverity] = useState('')
  const [impact, setImpact] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [niTitle, setNiTitle] = useState('')
  const [niSeverity, setNiSeverity] = useState('high')
  const [niImpact, setNiImpact] = useState('system')

  function load() {
    setLoading(true)
    setError(null)
    // Page through the incidents (pageSize is capped server-side, so we fetch two pages).
    Promise.all([
      apiGet<Paginated<Incident>>('/incidents?page=1&pageSize=200'),
      apiGet<Paginated<Incident>>('/incidents?page=2&pageSize=200')
    ])
      .then(([a, b]) => setAll([...a.items, ...b.items]))
      .catch((e) => setError(e))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  // Client-side KPIs + filtering, recomputed each render.
  const active = all.filter((i) => i.status !== 'resolved').length
  const critical = all.filter((i) => i.severity === 'critical').length
  const resolvedList = all.filter((i) => i.status === 'resolved' && i.resolvedAt)
  const avgResolution =
    resolvedList.length === 0
      ? 0
      : Math.round(
          resolvedList.reduce(
            (sum, i) => sum + (Date.parse(i.resolvedAt!) - Date.parse(i.createdAt)),
            0
          ) / resolvedList.length
        )
  const resolvedThisWeek = resolvedList.filter(
    (i) => REFERENCE_NOW - Date.parse(i.resolvedAt!) <= WEEK_MS
  ).length

  const rows = all.filter((i) => {
    if (status && i.status !== status) return false
    if (severity && i.severity !== severity) return false
    if (impact && i.impact !== impact) return false
    return true
  })

  return (
    <div className="page">
      <div className="pageHead">
        <div>
          <h1 className="pageTitle">Incidents</h1>
          <p className="pageSubtitle">Open incidents and their linked signals.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setDialogOpen(true)}>
          New incident
        </button>
      </div>

      {notice && (
        <div className="banner banner-ok">
          {notice}
          <button
            className="btn btn-secondary btn-sm"
            style={{ marginLeft: 'auto' }}
            onClick={() => setNotice(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <SkeletonRows rows={8} />
      ) : error ? (
        <ErrorState error={error} onRetry={load} />
      ) : (
        <>
          <div className="grid-kpis">
            <KpiCard
              kpi={{
                label: 'Active incidents',
                value: active,
                trend: 'flat',
                trendLabel: 'currently open'
              }}
            />
            <KpiCard
              kpi={{ label: 'Critical', value: critical, trend: 'up', trendLabel: 'this month' }}
            />
            <KpiCard
              kpi={{
                label: 'Avg resolution time',
                value: avgResolution,
                display: formatDuration(avgResolution),
                trend: 'down',
                trendLabel: 'faster than avg'
              }}
            />
            <KpiCard
              kpi={{
                label: 'Resolved this week',
                value: resolvedThisWeek,
                trend: 'up',
                trendLabel: 'vs last week'
              }}
            />
          </div>

          <Card>
            <div className="row">
              <div className="field">
                <label className="fieldLabel">Status</label>
                <select
                  className="select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">All</option>
                  {INCIDENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s === 'in_progress' ? 'In progress' : s[0].toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="fieldLabel">Severity</label>
                <select
                  className="select"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                >
                  <option value="">All</option>
                  {SEVERITIES.map((s) => (
                    <option key={s} value={s}>
                      {s[0].toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="fieldLabel">Impact</label>
                <select
                  className="select"
                  value={impact}
                  onChange={(e) => setImpact(e.target.value)}
                >
                  <option value="">All</option>
                  {IMPACTS.map((s) => (
                    <option key={s} value={s}>
                      {s[0].toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="fieldLabel">Reset</label>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setStatus('')
                    setSeverity('')
                    setImpact('')
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          </Card>

          <Card flush>
            {rows.length === 0 ? (
              <EmptyState message="No incidents match your current filters." />
            ) : (
              <div className="tableWrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Incident</th>
                      <th>Severity</th>
                      <th>Status</th>
                      <th>Impact</th>
                      <th>Linked signals</th>
                      <th>Owner</th>
                      <th>Open for</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((inc) => (
                      <tr key={inc.id}>
                        <td>
                          <div className="cellTitle">{inc.title}</div>
                          <div className="cellSub mono">{inc.id}</div>
                        </td>
                        <td>
                          <SeverityBadge severity={inc.severity} />
                        </td>
                        <td>
                          <IncidentStatusBadge status={inc.status} />
                        </td>
                        <td>
                          <ImpactBadge impact={inc.impact} />
                        </td>
                        <td className="mono">{inc.linkedSignalIds.length}</td>
                        <td className="mono">{inc.owner}</td>
                        <td>
                          {inc.status === 'resolved'
                            ? 'Closed'
                            : ageSince(inc.createdAt, REFERENCE_NOW)}
                        </td>
                        <td>
                          {inc.linkedSignalIds[0] ? (
                            <Link
                              className="btn btn-secondary btn-sm"
                              to={`/signals/${inc.linkedSignalIds[0]}`}
                            >
                              View
                            </Link>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {dialogOpen && (
        <div className="modalOverlay" onMouseDown={() => setDialogOpen(false)}>
          <div className="modalCard" onMouseDown={(e) => e.stopPropagation()}>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const name = niTitle.trim() || 'Untitled incident'
                setDialogOpen(false)
                setNotice(
                  `New incident “${name}” created — demo build, so it is not persisted to the dataset.`
                )
                setNiTitle('')
                setNiSeverity('high')
                setNiImpact('system')
              }}
            >
              <div className="modalHead">
                <h2 className="cardTitle" style={{ margin: 0 }}>
                  New incident
                </h2>
                <p className="muted" style={{ margin: '4px 0 0', fontSize: 12.5 }}>
                  Group related signals into an incident.
                </p>
              </div>
              <div className="modalBody">
                <div className="field">
                  <label className="fieldLabel" htmlFor="ni-title">
                    Title
                  </label>
                  <input
                    id="ni-title"
                    className="input"
                    autoFocus
                    placeholder="e.g. Coordinated authentication abuse"
                    value={niTitle}
                    onChange={(e) => setNiTitle(e.target.value)}
                  />
                </div>
                <div className="grid-2" style={{ gap: 12 }}>
                  <div className="field">
                    <label className="fieldLabel" htmlFor="ni-sev">
                      Severity
                    </label>
                    <select
                      id="ni-sev"
                      className="select"
                      value={niSeverity}
                      onChange={(e) => setNiSeverity(e.target.value)}
                    >
                      {SEVERITIES.map((s) => (
                        <option key={s} value={s}>
                          {s[0].toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label className="fieldLabel" htmlFor="ni-impact">
                      Impact
                    </label>
                    <select
                      id="ni-impact"
                      className="select"
                      value={niImpact}
                      onChange={(e) => setNiImpact(e.target.value)}
                    >
                      {IMPACTS.map((s) => (
                        <option key={s} value={s}>
                          {s[0].toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="muted" style={{ fontSize: 12.5 }}>
                  Demo build — the dataset is read-only, so this incident is confirmed but not
                  persisted.
                </p>
              </div>
              <div className="modalFoot">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
