import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiGet } from '../api'
import type { ApiError, Paginated, Signal } from '../types'
import { confidenceLabel, formatStatus } from '../helpers'
import { SEVERITIES, STATUSES, SOURCES } from '../constants'
import {
  Card,
  SeverityBadge,
  StatusBadge,
  RiskTrendBadge,
  RiskCell,
  ErrorState,
  SkeletonRows,
  EmptyState
} from '../components'

// Local copy of the source labels (also in helpers.ts). Kept here so the table is self-contained.
const SOURCE_LABEL: Record<string, string> = {
  web: 'Web',
  social: 'Social',
  internal: 'Internal',
  partner: 'Partner',
  api: 'API',
  manual: 'Manual'
}

const PAGE_SIZE = 100

export function Signals() {
  const [params] = useSearchParams()
  const [search, setSearch] = useState(params.get('search') || '')
  const [severity, setSeverity] = useState('')
  const [status, setStatus] = useState('')
  const [source, setSource] = useState('')
  const [riskTrend, setRiskTrend] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState('riskScore')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)

  const [data, setData] = useState<Paginated<Signal> | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function load() {
    setLoading(true)
    setError(null)
    const qs = new URLSearchParams()
    if (search) qs.set('search', search)
    if (severity) qs.set('severity', severity)
    if (status) qs.set('status', status)
    if (source) qs.set('source', source)
    if (riskTrend) qs.set('riskTrend', riskTrend)
    if (assignedTo) qs.set('assignedTo', assignedTo)
    if (dateFrom) qs.set('dateFrom', new Date(dateFrom).toISOString())
    if (dateTo) qs.set('dateTo', new Date(dateTo).toISOString())
    qs.set('sortBy', sortBy)
    qs.set('sortDirection', sortDirection)
    qs.set('page', String(page))
    qs.set('pageSize', String(PAGE_SIZE))
    apiGet<Paginated<Signal>>('/signals?' + qs.toString())
      .then((d) => setData(d))
      .catch((e) => setError(e))
      .finally(() => setLoading(false))
  }

  // Refetch whenever anything changes. No debounce - every keystroke hits the API.
  useEffect(() => {
    load()
  }, [
    search,
    severity,
    status,
    source,
    riskTrend,
    assignedTo,
    dateFrom,
    dateTo,
    sortBy,
    sortDirection,
    page
  ])

  // Redundant client-side filter over the current page (the server already filtered). Recomputed
  // on every render - no useMemo. Fine at this page size, wasteful at scale.
  const rows = (data?.items || []).filter((s) => {
    if (!search) return true
    const hay = (s.title + ' ' + s.id + ' ' + s.source + ' ' + (s.assignedTo || '')).toLowerCase()
    return hay.includes(search.toLowerCase())
  })

  function toggleSort(field: string) {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDirection('desc')
    }
    setPage(1)
  }

  function toggleRow(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  function toggleAll() {
    if (rows.every((r) => selected.has(r.id))) {
      setSelected(new Set())
    } else {
      setSelected(new Set(rows.map((r) => r.id)))
    }
  }

  function resetFilters() {
    setSearch('')
    setSeverity('')
    setStatus('')
    setSource('')
    setRiskTrend('')
    setAssignedTo('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1
  const selectedRows = rows.filter((r) => selected.has(r.id))
  const avgRisk =
    selectedRows.length === 0
      ? 0
      : Math.round(selectedRows.reduce((sum, r) => sum + r.riskScore, 0) / selectedRows.length)

  return (
    <div className="page">
      <div className="pageHead">
        <div>
          <h1 className="pageTitle">Signals Explorer</h1>
          <p className="pageSubtitle">
            {total.toLocaleString()} signals · sorted by{' '}
            {sortBy === 'riskScore' ? 'risk score' : sortBy}
          </p>
        </div>
        <div className="row">
          <button className="btn btn-secondary">Columns</button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              const header = [
                'id',
                'title',
                'severity',
                'status',
                'source',
                'riskScore',
                'riskTrend',
                'confidence',
                'assignedTo',
                'createdAt',
                'hasLinkedIncident'
              ]
              const lines = [header.join(',')]
              for (const s of rows) {
                lines.push(
                  [
                    s.id,
                    JSON.stringify(s.title),
                    s.severity,
                    s.status,
                    s.source,
                    s.riskScore,
                    s.riskTrend ?? '',
                    s.confidence ?? '',
                    s.assignedTo ?? '',
                    s.createdAt,
                    s.hasLinkedIncident
                  ].join(',')
                )
              }
              const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'signals.csv'
              a.click()
              URL.revokeObjectURL(url)
            }}
          >
            Export
          </button>
        </div>
      </div>

      <Card>
        <div className="filterBar">
          <div className="field">
            <label className="fieldLabel" htmlFor="f-search">
              Search
            </label>
            <input
              id="f-search"
              className="input"
              placeholder="Title, ID, source, assignee…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <div className="field">
            <label className="fieldLabel" htmlFor="f-sev">
              Severity
            </label>
            <select
              id="f-sev"
              className="select"
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value)
                setPage(1)
              }}
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
            <label className="fieldLabel" htmlFor="f-status">
              Status
            </label>
            <select
              id="f-status"
              className="select"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {formatStatus(s as any)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="fieldLabel" htmlFor="f-source">
              Source
            </label>
            <select
              id="f-source"
              className="select"
              value={source}
              onChange={(e) => {
                setSource(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All</option>
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {SOURCE_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="fieldLabel" htmlFor="f-trend">
              Risk trend
            </label>
            <select
              id="f-trend"
              className="select"
              value={riskTrend}
              onChange={(e) => {
                setRiskTrend(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All</option>
              <option value="up">Rising</option>
              <option value="stable">Stable</option>
              <option value="down">Falling</option>
            </select>
          </div>
          <div className="field">
            <label className="fieldLabel" htmlFor="f-assigned">
              Assigned to
            </label>
            <select
              id="f-assigned"
              className="select"
              value={assignedTo}
              onChange={(e) => {
                setAssignedTo(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </div>
          <div className="field">
            <label className="fieldLabel">Reset</label>
            <button className="btn btn-secondary" onClick={resetFilters}>
              Reset filters
            </button>
          </div>
        </div>
      </Card>

      <Card flush>
        {selected.size > 0 ? (
          <div className="selectionBar">
            <strong>{selected.size} selected</strong>
            <span className="muted">avg risk {avgRisk}</span>
            <button className="btn btn-secondary btn-sm">Assign selected</button>
            <button className="btn btn-secondary btn-sm">Mark as triaged</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>
              Clear
            </button>
          </div>
        ) : (
          <div className="tableToolbar">
            <span>{rows.length} results · ready for 10,000+ rows</span>
            <span className="muted">
              page {page} of {Math.max(1, totalPages)}
            </span>
          </div>
        )}

        {loading ? (
          <div style={{ padding: 16 }}>
            <SkeletonRows rows={8} />
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={load} />
        ) : rows.length === 0 ? (
          <EmptyState message="No signals match your current filters." />
        ) : (
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 34 }}>
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      checked={rows.length > 0 && rows.every((r) => selected.has(r.id))}
                      onChange={toggleAll}
                    />
                  </th>
                  <th>Title</th>
                  <th className="sortable" onClick={() => toggleSort('severity')}>
                    Severity
                  </th>
                  <th>Status</th>
                  <th>Source</th>
                  <th className="sortable" onClick={() => toggleSort('riskScore')}>
                    Risk score
                  </th>
                  <th>Risk trend</th>
                  <th>Confidence</th>
                  <th>Assigned to</th>
                  <th className="sortable" onClick={() => toggleSort('createdAt')}>
                    Created
                  </th>
                  <th>Linked incident</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className={selected.has(s.id) ? 'selected' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Select ${s.id}`}
                        checked={selected.has(s.id)}
                        onChange={() => toggleRow(s.id)}
                      />
                    </td>
                    <td>
                      <Link to={`/signals/${s.id}`} className="cellTitle">
                        {s.title}
                      </Link>
                      <div className="cellSub mono">{s.id}</div>
                    </td>
                    <td>
                      <SeverityBadge severity={s.severity} />
                    </td>
                    <td>
                      <StatusBadge status={s.status} />
                    </td>
                    <td>{SOURCE_LABEL[s.source]}</td>
                    <td>
                      <RiskCell score={s.riskScore} />
                    </td>
                    <td>
                      {s.riskTrend ? (
                        <RiskTrendBadge trend={s.riskTrend} />
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      {s.confidence === null ? (
                        <span className="muted">Unavailable</span>
                      ) : (
                        confidenceLabel(s.confidence)
                      )}
                    </td>
                    <td className="mono">
                      {s.assignedTo || <span className="muted">Unassigned</span>}
                    </td>
                    <td className="mono">{new Date(s.createdAt).toISOString().slice(0, 10)}</td>
                    <td>
                      {s.hasLinkedIncident ? (
                        <span className="linkAccent mono">Linked</span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <Link to={`/signals/${s.id}`} className="btn btn-secondary btn-sm">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="pager">
          <button
            className="btn btn-secondary btn-sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span>
            Page {page} of {Math.max(1, totalPages)}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      </Card>
    </div>
  )
}
