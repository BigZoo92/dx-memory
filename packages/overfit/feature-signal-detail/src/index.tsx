'use client'

import { useEffect, useState } from 'react'
import type {
  ApiError,
  SignalDetailResponse,
  TimelineEvent
} from '@signalops/overfit-contracts-generated'
import { overfitApi } from '@signalops/overfit-api-client'
import {
  Card,
  ErrorState,
  RiskTrendBadge,
  SeverityBadge,
  SkeletonRows,
  StatTile,
  StatusBadge,
  confidenceLabel,
  confidencePercent,
  formatSource,
  riskColor,
  riskTrendLabel
} from '@signalops/overfit-ui'

export function SignalDetailPage({ id }: { id: string }) {
  const [detail, setDetail] = useState<SignalDetailResponse | null>(null)
  const [events, setEvents] = useState<TimelineEvent[] | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [eventsError, setEventsError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    setError(null)
    setEventsError(null)
    overfitApi
      .getSignal(id)
      .then(setDetail)
      .catch((e: ApiError) => setError(e))
      .finally(() => setLoading(false))
    overfitApi
      .getSignalEvents(id)
      .then(setEvents)
      .catch((e: ApiError) => setEventsError(e))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading) return <SkeletonRows rows={6} />
  if (error)
    return (
      <div className="page">
        <a href="/signals" className="linkAccent">
          ← Back to signals
        </a>
        <div className="errorState">
          <div>{error.code === 'not_found' ? 'Signal not found' : error.message}</div>
          {error.requestId ? <div className="code">requestId: {error.requestId}</div> : null}
        </div>
      </div>
    )
  if (!detail) return <ErrorState error={error} onRetry={load} />

  const s = detail.signal
  const resolved = s.status === 'resolved'

  return (
    <div className="page">
      <a href="/signals" className="linkAccent">
        ← Back to signals
      </a>

      <Card>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <div className="row" style={{ gap: 8 }}>
              <SeverityBadge severity={s.severity} />
              <StatusBadge status={s.status} />
              {s.riskTrend && <RiskTrendBadge trend={s.riskTrend} />}
              <span className="mono muted">{s.id}</span>
            </div>
            <h1 className="pageTitle" style={{ fontSize: 22, marginTop: 8 }}>
              {s.title}
            </h1>
            <p className="pageSubtitle">
              Source {formatSource(s.source)} · Created {new Date(s.createdAt).toISOString().slice(0, 10)}
            </p>
          </div>
          <div className="row">
            <button className="btn btn-secondary" disabled={resolved}>
              Assign
            </button>
            <button className="btn btn-secondary" disabled={resolved}>
              Change status
            </button>
            <button className="btn btn-danger" disabled={resolved}>
              Escalate
            </button>
            <button className="btn btn-primary" disabled={resolved}>
              Resolve
            </button>
          </div>
        </div>

        <div className="grid-kpis" style={{ marginTop: 16 }}>
          <StatTile label="Risk score" value={s.riskScore} barPercent={s.riskScore} barColor={riskColor(s.riskScore)} />
          <StatTile label="Risk trend" value={s.riskTrend ? riskTrendLabel(s.riskTrend) : 'Unknown'} />
          <StatTile
            label="Confidence"
            value={confidenceLabel(s.confidence)}
            barPercent={confidencePercent(s.confidence)}
          />
          <StatTile label="Assigned to" value={s.assignedTo || 'Unassigned'} />
        </div>
      </Card>

      <div className="grid-detail">
        <div className="stack">
          <Card title="Description">
            <p style={{ marginTop: 0 }}>{s.description}</p>
            <div className="chipRow">
              {s.tags.map((t) => (
                <span key={t} className="chip">
                  {t}
                </span>
              ))}
            </div>
          </Card>

          <Card title="Linked sources">
            <div className="list">
              <div className="listRow">
                <span>{formatSource(s.source)} connector</span>
                <span className="muted">Primary</span>
              </div>
              <div className="listRow">
                <span>Baseline scoring model</span>
                <span className="muted mono">v2.4</span>
              </div>
            </div>
          </Card>

          <Card title="Timeline">
            {eventsError ? (
              <div className="banner banner-error">
                Some widgets could not be refreshed.
                <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }} onClick={load}>
                  Retry
                </button>
              </div>
            ) : !events ? (
              <SkeletonRows rows={4} />
            ) : (
              <div className="timeline">
                {events.slice(0, 12).map((e) => (
                  <div key={e.id} className="timelineItem">
                    <span className="timelineDot" />
                    <div>
                      <div className="timelineLabel">{e.label}</div>
                      <div className="timelineMeta">
                        {e.actor} · {new Date(e.createdAt).toISOString().slice(0, 16).replace('T', ' ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="stack">
          <div className="aiCard">
            <span className="aiTag">AI · mock</span>
            <p style={{ margin: '10px 0' }}>
              This signal matches a known pattern of {s.source} anomalies. Confidence is{' '}
              {confidenceLabel(s.confidence).toLowerCase()}. Risk is {s.riskTrend ? riskTrendLabel(s.riskTrend).toLowerCase() : 'stable'}.
              Review before escalation.
            </p>
          </div>

          <Card title="Recommended action">
            <div className={s.severity === 'critical' ? 'callout callout-red' : 'callout callout-amber'}>
              {s.severity === 'critical'
                ? 'Escalate to an incident now — critical risk detected.'
                : 'Review recommended before escalation.'}
            </div>
          </Card>

          <Card title="Linked incident">
            {detail.linkedIncident ? (
              <a href="/incidents" className="listRow" style={{ textDecoration: 'none' }}>
                <div>
                  <div className="cellTitle">{detail.linkedIncident.title}</div>
                  <div className="cellSub mono">{detail.linkedIncident.id}</div>
                </div>
                <span className="linkAccent">View →</span>
              </a>
            ) : (
              <div className="muted">Not linked</div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
