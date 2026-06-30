import type { ReactNode } from 'react'
import { Card } from './Card'
import styles from './Cards.module.css'

export type TrendTone = 'good' | 'bad' | 'neutral'

export type KpiCardProps = {
  label: string
  value: string
  /** Trend chip: arrow + text, colored by tone — never color alone. */
  trend?: { arrow: '▲' | '▼' | '■'; text: string; note?: string; tone: TrendTone }
  icon?: ReactNode
  iconBg?: string
  iconColor?: string
}

const TREND_CLASS: Record<TrendTone, string> = {
  good: styles.trendGood,
  bad: styles.trendBad,
  neutral: styles.trendNeutral
}

/** Overview KPI card: label, icon tile, large value and a trend chip. */
export function KpiCard({ label, value, trend, icon, iconBg, iconColor }: KpiCardProps) {
  return (
    <Card>
      <div className={styles.kpi}>
        <div className={styles.kpiTop}>
          <span className={styles.kpiLabel}>{label}</span>
          {icon ? (
            <span className={styles.iconTile} style={{ background: iconBg, color: iconColor }}>
              {icon}
            </span>
          ) : null}
        </div>
        <div className={styles.kpiValue}>{value}</div>
        {trend ? (
          <span className={`${styles.trend} ${TREND_CLASS[trend.tone]}`}>
            <span aria-hidden="true">{trend.arrow}</span>
            {trend.text}
            {trend.note ? <span className={styles.trendNote}>{trend.note}</span> : null}
          </span>
        ) : null}
      </div>
    </Card>
  )
}

export type MetricSub = { label: string; value: string }

export type MetricCardProps = {
  axis: string
  accentColor: string
  accentBg: string
  icon: ReactNode
  headlineLabel: string
  headlineValue: string
  subs: MetricSub[]
}

/** DX Metrics "big card" (Build / Ship / Run / Change), each with its own accent. */
export function MetricCard({
  axis,
  accentColor,
  accentBg,
  icon,
  headlineLabel,
  headlineValue,
  subs
}: MetricCardProps) {
  return (
    <Card>
      <div className={styles.metricHead}>
        <span className={styles.metricBadge} style={{ background: accentBg, color: accentColor }}>
          {icon}
        </span>
        <span className={styles.metricAxis} style={{ color: accentColor }}>
          {axis}
        </span>
      </div>
      <div className={styles.metricLabel}>{headlineLabel}</div>
      <div className={styles.metricValue}>{headlineValue}</div>
      {subs.map((sub) => (
        <div key={sub.label} className={styles.subRow}>
          <span className={styles.subLabel}>{sub.label}</span>
          <span className={styles.subValue}>{sub.value}</span>
        </div>
      ))}
    </Card>
  )
}

export type StatTileProps = {
  label: string
  value: ReactNode
  unit?: string
  bar?: { percent: number; color: string }
}

/** Compact metric tile (signal detail header, DX perf). Optional progress bar. */
export function StatTile({ label, value, unit, bar }: StatTileProps) {
  return (
    <div className={styles.stat}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>
        {value}
        {unit ? <span className={styles.unit}> {unit}</span> : null}
      </div>
      {bar ? (
        <div className={styles.bar}>
          <div
            className={styles.barFill}
            style={{ width: `${Math.min(100, Math.max(0, bar.percent))}%`, background: bar.color }}
          />
        </div>
      ) : null}
    </div>
  )
}
