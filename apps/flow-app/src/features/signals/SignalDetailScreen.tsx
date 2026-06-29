import { useState } from 'react'
import { Link, getRouteApi } from '@tanstack/react-router'
import type { Signal } from '@signalops/contracts'
import { formatSource, normalizeConfidence, riskBand } from '@signalops/flow-domain'
import {
  AiCard,
  Banner,
  Button,
  Card,
  CardHeader,
  ConfidenceDisplay,
  EmptyState,
  RecommendedAction,
  SeverityBadge,
  StatTile,
  StatusBadge,
  Timeline,
  PartialError,
  SkeletonRows
} from '@signalops/flow-ui'
import { useSignalDetail, useSignalEvents } from '../../shared/api/queries'
import { QueryState } from '../../shared/QueryState'
import { formatDateTime } from '../../shared/formatting/date'
import styles from './SignalDetail.module.css'

const routeApi = getRouteApi('/signals/$id')

const RISK_COLOR = (score: number) =>
  riskBand(score) === 'critical' ? '#ef4444' : riskBand(score) === 'high' ? '#ef7e00' : '#eab308'

function DetailBody({ signal }: { signal: Signal }) {
  const [banner, setBanner] = useState<string | null>(null)
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

  return (
    <div className="so-page">
      <Link to="/signals" className={styles.backLink}>
        ← Back to signals
      </Link>

      {banner ? (
        <Banner tone="info" onRetry={() => setBanner(null)} retryLabel="Dismiss">
          {banner}
        </Banner>
      ) : null}

      <Card>
        <div className={styles.headerBadges}>
          <SeverityBadge severity={signal.severity} />
          <StatusBadge status={signal.status} />
          <span className={styles.monoId}>{signal.id}</span>
        </div>
        <h1 className={styles.detailTitle}>{signal.title}</h1>
        <p className={styles.detailMeta}>
          Source {formatSource(signal.source)} · Created {formatDateTime(signal.createdAt)}
        </p>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={() => setBanner('Assign (demo action).')}>
            Assign
          </Button>
          <Button variant="secondary" onClick={() => setBanner('Change status (demo action).')}>
            Change status
          </Button>
          <Button variant="danger" onClick={() => setBanner('Escalate (demo action).')}>
            Escalate
          </Button>
          <Button variant="primary" onClick={() => setBanner('Resolve (demo action).')}>
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
          <StatTile label="Source" value={formatSource(signal.source)} />
          <StatTile label="Assigned to" value={signal.assignedTo ?? 'Unassigned'} />
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

export function SignalDetailScreen() {
  const { id } = routeApi.useParams()
  const query = useSignalDetail(id)
  return (
    <QueryState query={query} errorTitle="Signal not found">
      {(data) => <DetailBody signal={data.signal} />}
    </QueryState>
  )
}
