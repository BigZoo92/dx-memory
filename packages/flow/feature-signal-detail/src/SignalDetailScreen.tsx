import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { Signal, SignalStatus } from '@signalops/contracts'
import { formatDateTime, formatSource, normalizeConfidence, riskBand } from '@signalops/flow-domain'
import {
  AiCard,
  Banner,
  Button,
  Card,
  CardHeader,
  ConfidenceDisplay,
  EmptyState,
  QueryState,
  RecommendedAction,
  RiskTrendBadge,
  SeverityBadge,
  StatTile,
  StatusBadge,
  Timeline,
  PartialError,
  SkeletonRows,
  type BannerTone
} from '@signalops/flow-ui'
import { useSignalDetail, useSignalEvents } from '@signalops/flow-api-client'
import { nextStatus } from './status'
import styles from './SignalDetail.module.css'

const RISK_COLOR = (score: number) =>
  riskBand(score) === 'critical' ? '#ef4444' : riskBand(score) === 'high' ? '#ef7e00' : '#eab308'

const DEMO_ASSIGNEE = 'analyst-001'

function DetailBody({ signal }: { signal: Signal }) {
  // Local, optimistic action state so the demo actions have a VISIBLE effect (read-only dataset).
  const [status, setStatus] = useState<SignalStatus>(signal.status)
  const [assignedTo, setAssignedTo] = useState<string | null>(signal.assignedTo)
  const [banner, setBanner] = useState<{ tone: BannerTone; text: string } | null>(null)

  const events = useSignalEvents(signal.id)
  const detail = useSignalDetail(signal.id)
  const conf = normalizeConfidence(signal.confidence)
  const critical = signal.severity === 'critical'

  const timelineItems = (events.data ?? []).map((event) => ({
    title: event.label,
    description: `${event.type} · ${event.actor}`,
    time: formatDateTime(event.createdAt),
    color:
      event.type === 'escalated' ? '#d92d20' : event.type === 'resolved' ? '#067647' : '#ef7e00'
  }))

  const assign = () => {
    setAssignedTo(DEMO_ASSIGNEE)
    setBanner({ tone: 'info', text: `Assigned to ${DEMO_ASSIGNEE}.` })
  }
  const changeStatus = () => {
    const next = nextStatus(status)
    setStatus(next)
    setBanner({ tone: 'info', text: `Status changed to "${next}".` })
  }
  const escalate = () => {
    setStatus('investigating')
    setBanner({ tone: 'danger', text: 'Signal escalated — status set to investigating.' })
  }
  const resolve = () => {
    setStatus('resolved')
    setBanner({ tone: 'success', text: 'Signal resolved.' })
  }

  return (
    <div className="so-page">
      <Link to="/signals" className={styles.backLink}>
        ← Back to signals
      </Link>

      {banner ? (
        <Banner tone={banner.tone} onRetry={() => setBanner(null)} retryLabel="Dismiss">
          {banner.text}
        </Banner>
      ) : null}

      <Card>
        <div className={styles.headerBadges}>
          <SeverityBadge severity={signal.severity} />
          <StatusBadge status={status} />
          <span className={styles.monoId}>{signal.id}</span>
        </div>
        <h1 className={styles.detailTitle}>{signal.title}</h1>
        <p className={styles.detailMeta}>
          Source {formatSource(signal.source)} · Created {formatDateTime(signal.createdAt)}
        </p>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={assign}>
            Assign
          </Button>
          <Button variant="secondary" onClick={changeStatus}>
            Change status
          </Button>
          <Button variant="danger" onClick={escalate} disabled={status === 'resolved'}>
            Escalate
          </Button>
          <Button variant="primary" onClick={resolve} disabled={status === 'resolved'}>
            Resolve
          </Button>
        </div>
        <div className={styles.statTiles}>
          <StatTile
            label="Risk score"
            value={signal.riskScore}
            unit="/ 100"
            bar={{ percent: signal.riskScore, color: RISK_COLOR(signal.riskScore) }}
          />
          <StatTile
            label="Confidence"
            value={conf.available ? conf.label : 'Unavailable'}
            bar={conf.available ? { percent: conf.percent, color: '#2563eb' } : undefined}
          />
          <StatTile
            label="Risk trend"
            value={signal.riskTrend ? <RiskTrendBadge trend={signal.riskTrend} /> : 'Unavailable'}
          />
          <StatTile label="Source" value={formatSource(signal.source)} />
          <StatTile label="Assigned to" value={assignedTo ?? 'Unassigned'} />
        </div>
      </Card>

      <div className="so-grid-detail">
        <div className="so-stack">
          <Card>
            <CardHeader title="Description" />
            <p className={styles.description}>{signal.description}</p>
            <div className={styles.tags}>
              {signal.tags.map((tag) => (
                <span key={tag} className={styles.tag}>
                  {tag}
                </span>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Linked sources" />
            <div className={styles.sourceRow}>
              <span className={styles.sourceDot} style={{ background: '#ef7e00' }} />
              <span>
                <span className={styles.sourceName}>{formatSource(signal.source)} connector</span>
                <br />
                <span className={styles.sourceMeta}>
                  Primary source · {formatDateTime(signal.createdAt)}
                </span>
              </span>
            </div>
            <div className={styles.sourceRow}>
              <span className={styles.sourceDot} style={{ background: '#2563eb' }} />
              <span>
                <span className={styles.sourceName}>Baseline model v2.4</span>
                <br />
                <span className={styles.sourceMeta}>Scoring reference</span>
              </span>
            </div>
          </Card>

          <Card>
            <CardHeader title="Timeline" />
            {events.isPending ? (
              <SkeletonRows rows={4} />
            ) : events.isError ? (
              <PartialError onRetry={() => events.refetch()} />
            ) : (
              <Timeline items={timelineItems} />
            )}
          </Card>
        </div>

        <div className="so-stack">
          <AiCard>
            This signal shares its access and latency fingerprint with related{' '}
            {formatSource(signal.source)} signals. Confidence is{' '}
            {conf.available ? conf.label.toLowerCase() : 'currently unavailable'} — treat the score
            as provisional. The grouping points to a coordinated pattern rather than an isolated
            event.
          </AiCard>

          <RecommendedAction
            severity={signal.severity}
            title={
              critical
                ? 'Escalate to an incident and notify the on-call analyst.'
                : 'Review recommended before escalation.'
            }
            detail={
              critical
                ? 'Risk score and correlation both exceed the escalation threshold.'
                : 'Risk is elevated but remains below the automatic escalation threshold.'
            }
          />

          <Card>
            <CardHeader title="Linked incident" />
            {detail.data?.linkedIncident ? (
              <Link to="/incidents" className={styles.linkedIncident}>
                <span className={styles.sourceName}>{detail.data.linkedIncident.id}</span> ·{' '}
                {detail.data.linkedIncident.title}
              </Link>
            ) : (
              <EmptyState title="Not linked" message="This signal is not linked to an incident." />
            )}
          </Card>
        </div>
      </div>

      {/* Surfacing the confidence sentence explicitly for the invalid-data state. */}
      {!conf.available ? (
        <Card>
          <ConfidenceDisplay confidence={signal.confidence} mode="detail" />
        </Card>
      ) : null}
    </div>
  )
}

export function SignalDetailScreen({ signalId }: { signalId: string }) {
  const query = useSignalDetail(signalId)
  return (
    <QueryState query={query} errorTitle="Signal not found">
      {(data) => <DetailBody signal={data.signal} />}
    </QueryState>
  )
}
