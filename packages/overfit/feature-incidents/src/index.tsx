'use client'

import { useEffect, useState, type ReactNode } from 'react'
import type { ApiError, Incident } from '@signalops/overfit-contracts-generated'
import { overfitApi } from '@signalops/overfit-api-client'
import {
  Card,
  EmptyState,
  ErrorState,
  ImpactBadge,
  IncidentStatusBadge,
  KpiCard,
  SeverityBadge,
  SkeletonRows,
  ageSince,
  formatDuration,
  overfitHref
} from '@signalops/overfit-ui'

const REFERENCE_NOW = Date.parse('2026-06-29T12:00:00.000Z')
const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const cap = (v: string) => v.charAt(0).toUpperCase() + v.slice(1)
const SEVERITIES = ['low', 'medium', 'high', 'critical']
const IMPACTS = ['user', 'system', 'security', 'business']
const INCIDENT_STATUSES = ['open', 'in_progress', 'resolved']

export function IncidentsPage() {
  const [all, setAll] = useState<Incident[]>([])
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [severity, setSeverity] = useState('')
  const [impact, setImpact] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    Promise.all([
      overfitApi.listIncidents({ page: 1, pageSize: 200 }),
      overfitApi.listIncidents({ page: 2, pageSize: 200 })
    ])
      .then(([a, b]) => setAll([...a.items, ...b.items]))
      .catch((e: ApiError) => setError(e))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const active = all.filter((i) => i.status !== 'resolved').length
  const critical = all.filter((i) => i.severity === 'critical').length
  const resolvedList = all.filter((i) => i.status === 'resolved' && i.resolvedAt)
  const avgResolution =
    resolvedList.length === 0
      ? 0
      : Math.round(
          resolvedList.reduce(
            (sum, i) => sum + (Date.parse(i.resolvedAt as string) - Date.parse(i.createdAt)),
            0
          ) / resolvedList.length
        )
  const resolvedThisWeek = resolvedList.filter(
    (i) => REFERENCE_NOW - Date.parse(i.resolvedAt as string) <= WEEK_MS
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
              <Field label="Status" value={status} onChange={setStatus}>
                {INCIDENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s === 'in_progress' ? 'In progress' : cap(s)}
                  </option>
                ))}
              </Field>
              <Field label="Severity" value={severity} onChange={setSeverity}>
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {cap(s)}
                  </option>
                ))}
              </Field>
              <Field label="Impact" value={impact} onChange={setImpact}>
                {IMPACTS.map((s) => (
                  <option key={s} value={s}>
                    {cap(s)}
                  </option>
                ))}
              </Field>
              <div className="field">
                <span className="fieldLabel">Reset</span>
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
                      <th>
                        <span className="visually-hidden">Actions</span>
                      </th>
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
                            <a
                              className="btn btn-secondary btn-sm"
                              href={overfitHref(`/signals/${inc.linkedSignalIds[0]}`)}
                            >
                              View
                            </a>
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
        <div
          className="modalOverlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDialogOpen(false)
          }}
        >
          <div className="modalCard" role="dialog" aria-modal="true">
            <div className="modalHead">
              <h2 className="cardTitle" style={{ margin: 0 }}>
                New incident
              </h2>
              <p className="muted" style={{ margin: '4px 0 0', fontSize: 12.5 }}>
                Group related signals into an incident.
              </p>
            </div>
            <div className="modalBody">
              <p className="muted" style={{ fontSize: 12.5 }}>
                Demo build — the dataset is read-only, so this incident is confirmed but not
                persisted.
              </p>
            </div>
            <div className="modalFoot">
              <button className="btn btn-secondary" onClick={() => setDialogOpen(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setDialogOpen(false)
                  setNotice(
                    'New incident created — demo build, so it is not persisted to the dataset.'
                  )
                }}
              >
                Create incident
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field(props: {
  label: string
  value: string
  onChange: (v: string) => void
  children: ReactNode
}) {
  return (
    <div className="field">
      <label className="fieldLabel">{props.label}</label>
      <select
        className="select"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      >
        <option value="">All</option>
        {props.children}
      </select>
    </div>
  )
}
