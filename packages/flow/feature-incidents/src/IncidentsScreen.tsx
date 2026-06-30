import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { Incident } from '@signalops/contracts'
import { INCIDENT_IMPACTS, INCIDENT_STATUSES, SIGNAL_SEVERITIES } from '@signalops/contracts'
import {
  REFERENCE_NOW_MS,
  ageSince,
  computeIncidentSummary,
  formatDuration
} from '@signalops/flow-domain'
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  FilterSelect,
  Icon,
  ImpactBadge,
  IncidentStatusBadge,
  KpiCard,
  PageHeader,
  QueryState,
  SeverityBadge,
  type SelectOption
} from '@signalops/flow-ui'
import { useAllIncidents } from '@signalops/flow-api-client'
import { filterIncidents } from './filter'
import styles from './IncidentsScreen.module.css'

const cap = (v: string) => v.charAt(0).toUpperCase() + v.slice(1)
const opt = (values: readonly string[], label: (v: string) => string): SelectOption[] => [
  { value: '', label: 'All' },
  ...values.map((v) => ({ value: v, label: label(v) }))
]
const STATUS_OPTIONS = opt(INCIDENT_STATUSES, (v) => (v === 'in_progress' ? 'In progress' : cap(v)))
const SEVERITY_OPTIONS = opt(SIGNAL_SEVERITIES, cap)
const IMPACT_OPTIONS = opt(INCIDENT_IMPACTS, cap)

function IncidentsBody({ incidents }: { incidents: Incident[] }) {
  const [status, setStatus] = useState('')
  const [severity, setSeverity] = useState('')
  const [impact, setImpact] = useState('')

  const filtered = filterIncidents(incidents, { status, severity, impact })
  const summary = computeIncidentSummary(incidents, REFERENCE_NOW_MS)
  const reset = () => {
    setStatus('')
    setSeverity('')
    setImpact('')
  }

  return (
    <>
      <div className="so-grid-kpis">
        <KpiCard
          label="Active incidents"
          value={String(summary.active)}
          icon={<Icon name="incidents" size={16} />}
          iconBg="#eff4ff"
          iconColor="#175cd3"
        />
        <KpiCard
          label="Critical"
          value={String(summary.critical)}
          icon={<Icon name="incidents" size={16} />}
          iconBg="#fef3f2"
          iconColor="#d92d20"
        />
        <KpiCard
          label="Avg resolution time"
          value={formatDuration(summary.avgResolutionTimeMs)}
          icon={<Icon name="clock" size={16} />}
          iconBg="#ecfdf3"
          iconColor="#067647"
        />
        <KpiCard
          label="Resolved this week"
          value={String(summary.resolvedThisWeek)}
          icon={<Icon name="clock" size={16} />}
          iconBg="#fff1e3"
          iconColor="#c2630a"
        />
      </div>

      <Card>
        <div className={styles.filters}>
          <FilterSelect
            label="Status"
            value={status}
            options={STATUS_OPTIONS}
            onChange={setStatus}
          />
          <FilterSelect
            label="Severity"
            value={severity}
            options={SEVERITY_OPTIONS}
            onChange={setSeverity}
          />
          <FilterSelect
            label="Impact"
            value={impact}
            options={IMPACT_OPTIONS}
            onChange={setImpact}
          />
          <div className={styles.resetWrap}>
            <Button variant="secondary" onClick={reset}>
              Reset
            </Button>
          </div>
        </div>
      </Card>

      <Card padded={false}>
        <CardHeader title={`${filtered.length} incidents`} />
        {filtered.length === 0 ? (
          <EmptyState message="No incidents match your current filters." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Incident</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Impact</th>
                  <th>Linked signals</th>
                  <th>Owner</th>
                  <th>Open for</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((incident) => (
                  <tr key={incident.id}>
                    <td>
                      <span className={styles.id}>{incident.id}</span>
                      <br />
                      <span className={styles.title}>{incident.title}</span>
                    </td>
                    <td>
                      <SeverityBadge severity={incident.severity} />
                    </td>
                    <td>
                      <IncidentStatusBadge status={incident.status} />
                    </td>
                    <td>
                      <ImpactBadge impact={incident.impact} />
                    </td>
                    <td className={styles.mono}>
                      {incident.linkedSignalIds.length > 0 ? (
                        <Link to="/signals" className={styles.linkedLink}>
                          {incident.linkedSignalIds.length} linked
                        </Link>
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </td>
                    <td className={styles.mono}>{incident.owner}</td>
                    <td className={styles.mono}>
                      {incident.status === 'resolved' ? (
                        <span className={styles.muted}>Closed</span>
                      ) : (
                        ageSince(incident.createdAt, REFERENCE_NOW_MS)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}

export function IncidentsScreen() {
  const query = useAllIncidents()
  return (
    <div className="so-page">
      <PageHeader title="Incidents" subtitle="Open incidents and the signals behind them." />
      <QueryState query={query}>
        {(incidents) => <IncidentsBody incidents={incidents} />}
      </QueryState>
    </div>
  )
}
