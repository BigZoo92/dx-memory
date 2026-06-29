import { Link } from '@tanstack/react-router'
import type { DashboardSummary, SummaryKpi } from '@signalops/contracts'
import { formatSource, riskBand } from '@signalops/flow-domain'
import {
  AiCard,
  Button,
  Card,
  CardHeader,
  Icon,
  KpiCard,
  PageHeader,
  SeverityBadge,
  SeverityBars,
  StatusList,
  TrendChart,
  type IconName,
  type TrendTone
} from '@signalops/flow-ui'
import { useDashboardSummary } from '../../shared/api/queries'
import { QueryState } from '../../shared/QueryState'
import styles from './Dashboard.module.css'

type KpiConfig = {
  key: keyof DashboardSummary['kpis']
  icon: IconName
  color: string
  bg: string
  tone: TrendTone
}

const KPI_CONFIG: KpiConfig[] = [
  { key: 'openSignals', icon: 'signals', color: '#c2630a', bg: '#fff1e3', tone: 'neutral' },
  { key: 'criticalSignals', icon: 'incidents', color: '#d92d20', bg: '#fef3f2', tone: 'bad' },
  { key: 'activeIncidents', icon: 'clock', color: '#175cd3', bg: '#eff4ff', tone: 'good' },
  { key: 'avgQualificationTimeMs', icon: 'clock', color: '#067647', bg: '#ecfdf3', tone: 'good' }
]

const SEVERITY_DOT: Record<string, string> = {
  critical: '#d92d20',
  high: '#ef7e00',
  medium: '#d9a200',
  low: '#2563eb'
}

function kpiValue(kpi: SummaryKpi): string {
  return kpi.display ?? kpi.value.toLocaleString()
}

function arrowFor(trend: SummaryKpi['trend']): '▲' | '▼' | '■' {
  return trend === 'up' ? '▲' : trend === 'down' ? '▼' : '■'
}

export function DashboardScreen() {
  const query = useDashboardSummary()
  return (
    <div className="so-page">
      <PageHeader
        title="Overview"
        subtitle="Prioritize what matters first."
        actions={
          <Button variant="secondary">
            <Icon name="export" size={16} /> Export
          </Button>
        }
      />
      <QueryState query={query}>
        {(summary) => (
          <>
            <div className="so-grid-kpis">
              {KPI_CONFIG.map((config) => {
                const kpi = summary.kpis[config.key]
                return (
                  <KpiCard
                    key={config.key}
                    label={kpi.label}
                    value={kpiValue(kpi)}
                    icon={<Icon name={config.icon} size={16} />}
                    iconBg={config.bg}
                    iconColor={config.color}
                    trend={{ arrow: arrowFor(kpi.trend), text: kpi.trendLabel, tone: config.tone }}
                  />
                )
              })}
            </div>

            <div className="so-grid-overview">
              <Card>
                <CardHeader title="Signals by severity" />
                <SeverityBars data={summary.severityBreakdown} />
              </Card>
              <Card>
                <CardHeader title="Signals over time" subtitle="All vs critical · 14 days" />
                <TrendChart points={summary.signalsOverTime} />
              </Card>
            </div>

            <div className="so-grid-detail">
              <Card>
                <CardHeader title="Most critical signals" />
                {summary.mostCriticalSignals.map((signal) => (
                  <Link
                    key={signal.id}
                    to="/signals/$id"
                    params={{ id: signal.id }}
                    className={styles.criticalRow}
                  >
                    <span
                      className={styles.dot}
                      style={{ background: SEVERITY_DOT[signal.severity] }}
                      aria-hidden="true"
                    />
                    <span>
                      <span className={styles.critTitle}>{signal.title}</span>
                      <br />
                      <span className={styles.critMeta}>
                        {signal.id} · {formatSource(signal.source)}
                      </span>
                    </span>
                    <SeverityBadge severity={signal.severity} />
                    <span
                      className={styles.critRisk}
                      style={{
                        color: riskBand(signal.riskScore) === 'critical' ? '#d92d20' : undefined
                      }}
                    >
                      {signal.riskScore}
                    </span>
                  </Link>
                ))}
              </Card>
              <div className="so-grid-sidecol">
                <Card>
                  <CardHeader title="System status" />
                  <StatusList items={summary.systemStatus} />
                </Card>
                <AiCard title="AI recommendation">
                  3 critical signals from Partner API share the same latency pattern. Grouping them
                  into one incident may reduce qualification time by ~22%.
                </AiCard>
              </div>
            </div>

            <Card>
              <CardHeader title="Recent incidents" />
              <table className={styles.incidentTable}>
                <thead>
                  <tr>
                    <th>Incident</th>
                    <th>Severity</th>
                    <th>Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.recentIncidents.map((incident) => (
                    <tr key={incident.id}>
                      <td>
                        <span className={styles.incId}>{incident.id}</span> · {incident.title}
                      </td>
                      <td>
                        <SeverityBadge severity={incident.severity} />
                      </td>
                      <td>{incident.owner}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </>
        )}
      </QueryState>
    </div>
  )
}
