// Shared UI atoms. Everything visual that more than one page needs ends up here.
import type { ReactNode } from 'react'
import type { ApiError, Severity, SignalStatus, IncidentImpact, SummaryKpi } from './types'
import {
  formatSeverity,
  formatStatus,
  formatRiskTrend,
  severityHue,
  statusHue,
  impactHue,
  incidentStatusLabel,
  riskColor,
  riskTrendArrow,
  riskTrendHue
} from './helpers'

export function Card(props: {
  title?: string
  right?: ReactNode
  flush?: boolean
  children: ReactNode
}) {
  return (
    <div className="card">
      {props.title && (
        <div className="cardHeader">
          <h3 className="cardTitle">{props.title}</h3>
          {props.right}
        </div>
      )}
      <div className={props.flush ? 'cardBodyFlush' : 'cardBody'}>{props.children}</div>
    </div>
  )
}

export function Badge(props: { hue: string; children: ReactNode }) {
  return <span className={`badge badge-${props.hue}`}>{props.children}</span>
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <Badge hue={severityHue(severity)}>{formatSeverity(severity)}</Badge>
}

export function StatusBadge({ status }: { status: SignalStatus }) {
  return <Badge hue={statusHue(status)}>{formatStatus(status)}</Badge>
}

export function ImpactBadge({ impact }: { impact: IncidentImpact }) {
  const label = impact.charAt(0).toUpperCase() + impact.slice(1)
  return <Badge hue={impactHue(impact)}>{label}</Badge>
}

// Risk-trend badge. Always renders a text label, never color alone.
export function RiskTrendBadge({ trend }: { trend: 'up' | 'stable' | 'down' }) {
  return (
    <Badge hue={riskTrendHue(trend)}>
      <span aria-hidden>{riskTrendArrow(trend)}</span> {formatRiskTrend(trend)}
    </Badge>
  )
}

export function IncidentStatusBadge({ status }: { status: string }) {
  const hue = status === 'resolved' ? 'green' : status === 'in_progress' ? 'orange' : 'blue'
  return <Badge hue={hue}>{incidentStatusLabel(status)}</Badge>
}

export function TrendChip({ kpi }: { kpi: SummaryKpi }) {
  const arrow = kpi.trend === 'up' ? '▲' : kpi.trend === 'down' ? '▼' : '■'
  return (
    <span className={`trendChip trend-${kpi.trend}`}>
      <span aria-hidden>{arrow}</span> {kpi.trendLabel}
    </span>
  )
}

export function KpiCard({ kpi }: { kpi: SummaryKpi }) {
  return (
    <div className="card kpi">
      <div className="kpiTop">
        <span className="kpiLabel">{kpi.label}</span>
      </div>
      <div className="kpiValue">{kpi.display ?? kpi.value.toLocaleString()}</div>
      <TrendChip kpi={kpi} />
    </div>
  )
}

export function StatTile(props: {
  label: string
  value: ReactNode
  barPercent?: number
  barColor?: string
}) {
  return (
    <div className="statTile">
      <div className="statLabel">{props.label}</div>
      <div className="statValue">{props.value}</div>
      {props.barPercent !== undefined && (
        <div className="bar">
          <div
            className="barFill"
            style={{ width: `${props.barPercent}%`, background: props.barColor }}
          />
        </div>
      )}
    </div>
  )
}

export function RiskCell({ score }: { score: number }) {
  return (
    <div className="riskCell">
      <div className="riskBar">
        <div className="riskBarFill" style={{ width: `${score}%`, background: riskColor(score) }} />
      </div>
      <span className="mono">{score}</span>
    </div>
  )
}

export function Toggle(props: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.checked}
      aria-label={props.label}
      className="toggle"
      onClick={() => props.onChange(!props.checked)}
    >
      <span className="toggleKnob" />
    </button>
  )
}

export function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="stack" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 32 }} />
      ))}
    </div>
  )
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="spinnerRow">
      <span className="spinner" /> {label}
    </div>
  )
}

export function EmptyState({ message }: { message: string }) {
  return <div className="emptyState">{message}</div>
}

// Error state. Shows the message and the requestId (which, in this variant, rarely helps).
export function ErrorState({ error, onRetry }: { error: ApiError | null; onRetry?: () => void }) {
  return (
    <div className="errorState">
      <div>{error?.message ?? 'Something went wrong.'}</div>
      {error?.requestId ? <div className="code">requestId: {error.requestId}</div> : null}
      {onRetry && (
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={onRetry}>
            Retry
          </button>
        </div>
      )}
    </div>
  )
}

export function StatusDot({ tone }: { tone: string }) {
  const color =
    tone === 'operational' || tone === 'ok'
      ? 'var(--so-green-fg)'
      : tone === 'degraded'
        ? 'var(--so-amber-fg)'
        : 'var(--so-red-fg)'
  return (
    <span className="statusDot">
      <span className="dot" style={{ background: color }} />
    </span>
  )
}
