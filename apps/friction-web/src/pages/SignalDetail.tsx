import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiGet } from '../api'
import type { ApiError, SignalDetail as SignalDetailType, TimelineEvent } from '../types'
import { confidenceLabel, confidencePercent, formatSource, riskColor } from '../helpers'
import { Card, SeverityBadge, StatusBadge, StatTile, ErrorState, SkeletonRows } from '../components'

export function SignalDetail() {
  const { id } = useParams()
  const [detail, setDetail] = useState<SignalDetailType | null>(null)
  const [events, setEvents] = useState<TimelineEvent[] | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [eventsError, setEventsError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    setError(null)
    setEventsError(null)
    apiGet<SignalDetailType>(`/signals/${id}`)
      .then((d) => setDetail(d))
      .catch((e) => setError(e))
      .finally(() => setLoading(false))
    // Timeline is a separate request; it can fail on its own (partial error).
    apiGet<TimelineEvent[]>(`/signals/${id}/events`)
      .then((e) => setEvents(e))
      .catch((e) => setEventsError(e))
  }

  useEffect(() => {
    load()
  }, [id])

  if (loading) return <SkeletonRows rows={6} />
  if (error)
    return (
      <div className="page">
        <Link to="/signals" className="linkAccent">
          ← Back to signals
        </Link>
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
      <Link to="/signals" className="linkAccent">
        ← Back to signals
      </Link>

      <Card>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <div className="row" style={{ gap: 8 }}>
              <SeverityBadge severity={s.severity} />
              <StatusBadge status={s.status} />
              <span className="mono muted">{s.id}</span>
            </div>
            <h1 className="pageTitle" style={{ fontSize: 22, marginTop: 8 }}>
              {s.title}
            </h1>
            <p className="pageSubtitle">
              Source {formatSource(s.source)} · Created{' '}
              {new Date(s.createdAt).toISOString().slice(0, 10)}
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
          <StatTile
            label="Risk score"
            value={s.riskScore}
            barPercent={s.riskScore}
            barColor={riskColor(s.riskScore)}
          />
          <StatTile
            label="Confidence"
            value={confidenceLabel(s.confidence)}
            barPercent={confidencePercent(s.confidence)}
          />
          <StatTile label="Source" value={formatSource(s.source)} />
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
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ marginLeft: 'auto' }}
                  onClick={load}
                >
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
                        {e.actor} ·{' '}
                        {new Date(e.createdAt).toISOString().slice(0, 16).replace('T', ' ')}
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
              {confidenceLabel(s.confidence).toLowerCase()}. Review before escalation.
            </p>
          </div>

          <Card title="Recommended action">
            <div
              className={
                s.severity === 'critical' ? 'callout callout-red' : 'callout callout-amber'
              }
            >
              {s.severity === 'critical'
                ? 'Escalate to an incident now — critical risk detected.'
                : 'Review recommended before escalation.'}
            </div>
          </Card>

          <Card title="Linked incident">
            {detail.linkedIncident ? (
              <Link to="/incidents" className="listRow" style={{ textDecoration: 'none' }}>
                <div>
                  <div className="cellTitle">{detail.linkedIncident.title}</div>
                  <div className="cellSub mono">{detail.linkedIncident.id}</div>
                </div>
                <span className="linkAccent">View →</span>
              </Link>
            ) : (
              <div className="muted">Not linked</div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
