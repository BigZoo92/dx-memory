import {
  isSignalSeverity,
  isSignalStatus,
  type CompareAttribute,
  type CompareDelta
} from '@signalops/contracts'
import { SeverityBadge } from '../badges/SeverityBadge'
import { StatusBadge } from '../badges/StatusBadge'
import styles from './Compare.module.css'

const CHIP_CLASS: Record<CompareDelta, string> = {
  good: styles.good,
  bad: styles.bad,
  neutral: styles.neutral,
  'no-change': styles.muted
}

const DELTA_LABEL: Record<CompareDelta, string> = {
  good: 'Improved',
  bad: 'Worse',
  neutral: 'Changed',
  'no-change': 'No change'
}

/** Delta chip: text label + color (never color alone). */
export function DeltaChip({ delta, label }: { delta: CompareDelta; label?: string }) {
  return (
    <span className={`${styles.chip} ${CHIP_CLASS[delta]}`}>{label ?? DELTA_LABEL[delta]}</span>
  )
}

/** Render a value as a real badge for Severity/Status rows, plain text otherwise. */
function renderValue(attribute: string, value: string) {
  const lowered = value.toLowerCase()
  if (attribute === 'Severity' && isSignalSeverity(lowered))
    return <SeverityBadge severity={lowered} />
  if (attribute === 'Status' && isSignalStatus(lowered)) return <StatusBadge status={lowered} />
  return <span className={styles.value}>{value}</span>
}

/** One before → after attribute row with a delta chip; changed rows are tinted. */
export function DiffRow({ row }: { row: CompareAttribute }) {
  return (
    <div className={`${styles.diffRow} ${row.changed ? styles.diffRowChanged : ''}`}>
      <span className={styles.attr}>{row.attribute}</span>
      {renderValue(row.attribute, row.before)}
      <span className={styles.arrow} aria-hidden="true">
        {row.changed ? '→' : ''}
      </span>
      <span className={styles.after}>
        {renderValue(row.attribute, row.after)}
        <DeltaChip delta={row.delta} label={row.changed ? undefined : 'No change'} />
      </span>
    </div>
  )
}

/** The full before/after diff table. */
export function ComparePanel({ attributes }: { attributes: CompareAttribute[] }) {
  return (
    <div className={styles.diff}>
      <div className={styles.diffHead}>
        <span>Attribute</span>
        <span>Before</span>
        <span />
        <span>After</span>
      </div>
      {attributes.map((row) => (
        <DiffRow key={row.attribute} row={row} />
      ))}
    </div>
  )
}

export type ImpactMetric = { label: string; delta: CompareDelta; value: string }

/** Orange-tint user-impact card: a sentence + metric rows with good/bad chips. */
export function UserImpact({ sentence, metrics }: { sentence: string; metrics: ImpactMetric[] }) {
  return (
    <div className={styles.impact}>
      <p className={styles.impactSentence}>{sentence}</p>
      {metrics.map((metric) => (
        <div key={metric.label} className={styles.impactRow}>
          <span className={styles.impactLabel}>{metric.label}</span>
          <DeltaChip delta={metric.delta} label={metric.value} />
        </div>
      ))}
    </div>
  )
}
