import { useSyncExternalStore } from 'react'
import {
  METRIC_LOWER_IS_BETTER,
  type DxMetric,
  type DxMetricsResponse,
  type DxMetricNumericKey,
  type MetricAxis,
  type VariantId
} from '@signalops/contracts'
import {
  METRIC_LABELS,
  METRIC_ORDER,
  RUN_READINESS_SEED,
  aiTaskOutcome,
  buildAxisCards,
  formatMetricValue
} from '@signalops/flow-domain'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Icon,
  MetricCard,
  MetricsTable,
  PageHeader,
  RunHealthSummary,
  StatTile,
  VariantBars,
  QueryState,
  downloadTextFile,
  type IconName,
  type MetricsTableRow
} from '@signalops/flow-ui'
import { useDxMetrics } from '@signalops/flow-api-client'
import { computeRunCounters, evaluateAlerts, getDefaultStore } from '@signalops/flow-observability'
import { dxMetricsToCsv, dxMetricsToJson } from './export'
import styles from './DxMetrics.module.css'

const AXIS_ACCENT: Record<MetricAxis, { color: string; bg: string; icon: IconName }> = {
  Build: { color: '#ad5a00', bg: '#fff1e3', icon: 'dx-metrics' },
  Ship: { color: '#175cd3', bg: '#eff4ff', icon: 'compare' },
  Run: { color: '#067647', bg: '#ecfdf3', icon: 'signals' },
  Change: { color: '#6a4bdb', bg: '#f1edff', icon: 'overview' }
}

const VARIANT_COL: Record<VariantId, { label: string; tag: string; letter: 'A' | 'B' | 'C' }> = {
  friction: { label: 'Variant A', tag: 'Friction', letter: 'A' },
  flow: { label: 'Variant B', tag: 'Flow', letter: 'B' },
  overfit: { label: 'Variant C', tag: 'Overfit', letter: 'C' }
}
const VARIANT_ORDER: VariantId[] = ['friction', 'flow', 'overfit']

function bestVariant(byVariant: Map<VariantId, DxMetric>, key: DxMetricNumericKey): VariantId {
  const lowerIsBetter = METRIC_LOWER_IS_BETTER[key]
  let best = VARIANT_ORDER[0]
  for (const v of VARIANT_ORDER) {
    const value = byVariant.get(v)![key]
    const bestValue = byVariant.get(best)![key]
    if (lowerIsBetter ? value < bestValue : value > bestValue) best = v
  }
  return best
}

function buildTableRows(
  byVariant: Map<VariantId, DxMetric>,
  current: VariantId
): MetricsTableRow[] {
  return METRIC_ORDER.map((key) => {
    const best = bestVariant(byVariant, key)
    return {
      metric: METRIC_LABELS[key],
      cells: VARIANT_ORDER.map((v) => ({
        value: formatMetricValue(key, byVariant.get(v)![key]),
        best: v === best,
        current: v === current
      })),
      bestLabel: VARIANT_COL[best].tag
    }
  })
}

const COMPARISON_METRICS: DxMetricNumericKey[] = [
  'ciDurationMs',
  'bundleSizeKb',
  'filesTouchedForAiTask'
]

function useLiveRunCounters() {
  const store = getDefaultStore()
  const logs = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  const alerts = evaluateAlerts(logs, Date.now())
  return computeRunCounters(logs, alerts.length)
}

/** Run readiness: seed detect/diagnose/repair times plus the live operational counters. */
function RunReadinessCard() {
  const counters = useLiveRunCounters()
  return (
    <Card>
      <CardHeader
        title="Run readiness"
        subtitle="Counts are live from the in-memory observability store; detect/diagnose/repair are seed values."
      />
      <div className={styles.perfTiles}>
        <StatTile label="MTTD (seed)" value={RUN_READINESS_SEED.mttdSeconds} unit="s" />
        <StatTile
          label="Time to diagnose (seed)"
          value={RUN_READINESS_SEED.timeToDiagnoseSeconds}
          unit="s"
        />
        <StatTile label="MTTR (seed)" value={RUN_READINESS_SEED.mttrSeconds} unit="s" />
      </div>
      <div style={{ marginTop: 16 }}>
        <RunHealthSummary counters={counters} />
      </div>
      <p className={styles.outcome}>
        Diagnostic pack available —{' '}
        <a href="/ops" style={{ color: 'var(--so-accent-hover, #9a5100)', fontWeight: 600 }}>
          open Operational health
        </a>
        .
      </p>
    </Card>
  )
}

function MetricsBody({ data }: { data: DxMetricsResponse }) {
  const byVariant = new Map<VariantId, DxMetric>(data.metrics.map((m) => [m.variant, m]))
  const current = byVariant.get(data.current) ?? data.metrics[0]
  const axisCards = buildAxisCards(current)
  const outcome = aiTaskOutcome(current)

  return (
    <>
      <div className={styles.exportBar}>
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            downloadTextFile(
              'signalops-dx-metrics.csv',
              dxMetricsToCsv(data),
              'text/csv;charset=utf-8'
            )
          }
        >
          <Icon name="export" size={15} /> Export CSV
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            downloadTextFile(
              'signalops-dx-metrics.json',
              dxMetricsToJson(data),
              'application/json;charset=utf-8'
            )
          }
        >
          <Icon name="export" size={15} /> Export JSON
        </Button>
      </div>

      <div className={styles.axisGrid}>
        {axisCards.map((card) => {
          const accent = AXIS_ACCENT[card.axis]
          return (
            <MetricCard
              key={card.axis}
              axis={card.axis}
              accentColor={accent.color}
              accentBg={accent.bg}
              icon={<Icon name={accent.icon} size={16} />}
              headlineLabel={card.headlineLabel}
              headlineValue={card.headlineValue}
              subs={card.subs.map((s) => ({ label: s.label, value: s.value }))}
            />
          )
        })}
      </div>

      <Card>
        <CardHeader
          title="Variant comparison"
          subtitle="Current variant highlighted · lower is better"
        />
        <div className={styles.comparisonGrid}>
          {COMPARISON_METRICS.map((key) => (
            <VariantBars
              key={key}
              title={METRIC_LABELS[key]}
              bars={VARIANT_ORDER.map((v) => ({
                key: VARIANT_COL[v].letter,
                label: formatMetricValue(key, byVariant.get(v)![key]),
                value: byVariant.get(v)![key],
                current: v === data.current
              }))}
            />
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="AI task result"
          subtitle="Add a new capability across the app (cost of change)"
        />
        <div className={styles.aiTiles}>
          <StatTile label="Files touched" value={current.filesTouchedForAiTask} />
          <StatTile label="Tests impacted" value={current.testsImpacted} />
          <StatTile label="Error repro steps" value={current.errorReproductionSteps} />
          <StatTile label="Docs pages" value={current.docsPagesNeeded} />
        </div>
        <div className={styles.outcome}>
          <span
            className={`${styles.outcomeChip} ${outcome.kind === 'good' ? styles.good : styles.bad}`}
          >
            {outcome.label}
          </span>
          {outcome.kind === 'good'
            ? 'Completed in a single pass. Low review scope and no manual fixes needed.'
            : 'Completed, but the change rippled across many files — review scope is high.'}
        </div>
      </Card>

      <Card>
        <CardHeader title="Bundle & performance" />
        <div className={styles.perfTiles}>
          <StatTile label="Bundle size" value={current.bundleSizeKb} unit="KB" />
          <StatTile label="Main chunk" value={current.mainChunkSizeKb} unit="KB" />
          <StatTile
            label="Lighthouse"
            value={current.lighthousePerformance}
            unit="/ 100"
            bar={{
              percent: current.lighthousePerformance,
              color: current.lighthousePerformance >= 90 ? '#12b76a' : '#eab308'
            }}
          />
          <StatTile label="Table render" value={current.tableRenderTimeMs} unit="ms" />
        </div>
      </Card>

      <RunReadinessCard />

      <Card padded={false}>
        <CardHeader title="Full metrics" subtitle={`source: ${data.source}`} />
        <MetricsTable
          headers={VARIANT_ORDER.map((v) => ({
            label: VARIANT_COL[v].label,
            tag: v === data.current ? 'Current' : VARIANT_COL[v].tag,
            current: v === data.current
          }))}
          rows={buildTableRows(byVariant, data.current)}
        />
      </Card>

      <Card padded={false}>
        <CardHeader title="CI history" />
        <div className={styles.tableScroll}>
          <table className={styles.ciTable}>
            <thead>
              <tr>
                <th>Commit</th>
                <th>SHA · time</th>
                <th>Duration</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {CI_HISTORY.map((run) => (
                <tr key={run.sha}>
                  <td>{run.commit}</td>
                  <td className={styles.sha}>
                    {run.sha} · {run.when}
                  </td>
                  <td className={styles.sha}>{run.duration}</td>
                  <td>
                    <Badge hue={run.passed ? 'green' : 'red'}>
                      {run.passed ? 'Passed' : 'Failed'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

const CI_HISTORY = [
  {
    commit: 'feat: add risk-trend column to explorer',
    sha: 'a3f9c1',
    when: '12m ago',
    duration: '3m 40s',
    passed: true
  },
  {
    commit: 'fix: badge contrast on dismissed status',
    sha: '7b2e08',
    when: '38m ago',
    duration: '3m 40s',
    passed: true
  },
  {
    commit: 'refactor: signal scoring worker',
    sha: 'c91d4a',
    when: '1h 04m ago',
    duration: '—',
    passed: false
  },
  {
    commit: 'chore: bump dataset to v2.4.0',
    sha: '1d77ef',
    when: '2h 11m ago',
    duration: '3m 40s',
    passed: true
  },
  {
    commit: 'test: cover qualification timing',
    sha: 'b6e144',
    when: '5h 20m ago',
    duration: '3m 40s',
    passed: true
  }
]

export function DxMetricsScreen() {
  const query = useDxMetrics()
  return (
    <div className="so-page">
      <PageHeader
        title="DX Metrics"
        subtitle="Delivery cost and developer experience, compared across the three variants."
        actions={<Badge hue="orange">Showing Flow</Badge>}
      />
      <QueryState query={query}>{(data) => <MetricsBody data={data} />}</QueryState>
    </div>
  )
}
