'use client'

// Signals Explorer page. Consumes the API only through the api-client, maps each row through the
// view model, and renders with the shared UI primitives. Adds the Risk trend column + filter (the
// AI-task capability) while keeping the product identical to Flow/Friction.

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ApiError, Paginated, Signal } from '@signalops/overfit-contracts-generated'
import { overfitApi } from '@signalops/overfit-api-client'
import {
  Card,
  EmptyState,
  ErrorState,
  RiskCell,
  RiskTrendBadge,
  SeverityBadge,
  SkeletonRows,
  StatusBadge
} from '@signalops/overfit-ui'
import {
  RISK_TRENDS,
  SEVERITIES,
  SOURCES,
  STATUSES,
  toSignalRow,
  type SignalRowVM
} from './viewModel'

const PAGE_SIZE = 100
const cap = (v: string) => v.charAt(0).toUpperCase() + v.slice(1)
const SOURCE_LABEL: Record<string, string> = {
  web: 'Web',
  social: 'Social',
  internal: 'Internal',
  partner: 'Partner',
  api: 'API',
  manual: 'Manual'
}

export function SignalsPage({ initialSearch = '' }: { initialSearch?: string }) {
  const [search, setSearch] = useState(initialSearch)
  const [severity, setSeverity] = useState('')
  const [status, setStatus] = useState('')
  const [source, setSource] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [riskTrend, setRiskTrend] = useState('')
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
    overfitApi
      .listSignals({
        search: search || undefined,
        severity: (severity || undefined) as Signal['severity'] | undefined,
        status: (status || undefined) as Signal['status'] | undefined,
        source: (source || undefined) as Signal['source'] | undefined,
        assignedTo: assignedTo || undefined,
        riskTrend: (riskTrend || undefined) as Signal['riskTrend'],
        sortBy,
        sortDirection,
        page,
        pageSize: PAGE_SIZE
      })
      .then((d) => {
        setData(d)
        // Telemetry breadcrumb — the "too monitored" client step. Fire-and-forget.
        void overfitApi.postLog({ level: 'info', message: `signals.page loaded ${d.items.length} rows` }).catch(() => {})
      })
      .catch((e: ApiError) => setError(e))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, severity, status, source, assignedTo, riskTrend, sortBy, sortDirection, page])

  const rows: SignalRowVM[] = useMemo(() => (data?.items ?? []).map(toSignalRow), [data])

  function toggleSort(field: string) {
    if (sortBy === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    else {
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
    if (rows.length > 0 && rows.every((r) => selected.has(r.id))) setSelected(new Set())
    else setSelected(new Set(rows.map((r) => r.id)))
  }

  function resetFilters() {
    setSearch('')
    setSeverity('')
    setStatus('')
    setSource('')
    setAssignedTo('')
    setRiskTrend('')
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
          <button className="btn btn-secondary" onClick={() => exportCsv(rows)}>
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
          <FilterSelect id="f-sev" label="Severity" value={severity} onChange={setSeverity} setPage={setPage}>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {cap(s)}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect id="f-status" label="Status" value={status} onChange={setStatus} setPage={setPage}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {cap(s)}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect id="f-source" label="Source" value={source} onChange={setSource} setPage={setPage}>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {SOURCE_LABEL[s]}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect id="f-assigned" label="Assigned to" value={assignedTo} onChange={setAssignedTo} setPage={setPage}>
            <option value="unassigned">Unassigned</option>
          </FilterSelect>
          <FilterSelect id="f-trend" label="Risk trend" value={riskTrend} onChange={setRiskTrend} setPage={setPage}>
            {RISK_TRENDS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </FilterSelect>
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
                      <a href={`/signals/${s.id}`} className="cellTitle">
                        {s.title}
                      </a>
                      <div className="cellSub mono">{s.id}</div>
                    </td>
                    <td>
                      <SeverityBadge severity={s.severity} />
                    </td>
                    <td>
                      <StatusBadge status={s.status} />
                    </td>
                    <td>{s.sourceLabel}</td>
                    <td>
                      <RiskCell score={s.riskScore} />
                    </td>
                    <td>{s.riskTrend ? <RiskTrendBadge trend={s.riskTrend} /> : <span className="muted">—</span>}</td>
                    <td>
                      {s.confidenceAvailable ? (
                        s.confidenceLabel
                      ) : (
                        <span className="muted">Unavailable</span>
                      )}
                    </td>
                    <td className="mono">
                      {s.assignedTo || <span className="muted">Unassigned</span>}
                    </td>
                    <td className="mono">{s.createdDate}</td>
                    <td>
                      {s.hasLinkedIncident ? (
                        <span className="linkAccent mono">Linked</span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <a href={`/signals/${s.id}`} className="btn btn-secondary btn-sm">
                        View
                      </a>
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

function FilterSelect(props: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  setPage: (n: number) => void
  children: ReactNode
}) {
  return (
    <div className="field">
      <label className="fieldLabel" htmlFor={props.id}>
        {props.label}
      </label>
      <select
        id={props.id}
        className="select"
        value={props.value}
        onChange={(e) => {
          props.onChange(e.target.value)
          props.setPage(1)
        }}
      >
        <option value="">All</option>
        {props.children}
      </select>
    </div>
  )
}

function exportCsv(rows: SignalRowVM[]) {
  const header = ['id', 'title', 'severity', 'status', 'source', 'riskScore', 'riskTrend', 'confidence', 'assignedTo', 'createdAt', 'hasLinkedIncident']
  const lines = [header.join(',')]
  for (const s of rows) {
    lines.push(
      [
        s.id,
        JSON.stringify(s.title),
        s.severity,
        s.status,
        s.sourceLabel,
        s.riskScore,
        s.riskTrend ?? '',
        s.confidenceLabel,
        s.assignedTo ?? '',
        s.createdDate,
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
}
