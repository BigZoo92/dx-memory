import type { CSSProperties, ReactNode } from 'react'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import styles from './Table.module.css'

/** Shared dense-table class names, exported so the app can style its `<table>` markup
 * consistently while keeping the virtualization/TanStack Table wiring in the app layer. */
export { styles as tableStyles }

export type DataTableShellProps = {
  toolbar: ReactNode
  children: ReactNode
}

/** Card wrapper for a data table: a toolbar row above a horizontally-scrollable body. */
export function DataTableShell({ toolbar, children }: DataTableShellProps) {
  return (
    <Card padded={false} className={styles.shell}>
      {toolbar}
      <div className={styles.scroll}>{children}</div>
    </Card>
  )
}

export type BulkActionBarProps = {
  count: number
  avgRisk: number
  onAssign: () => void
  onTriage: () => void
  onClear: () => void
}

/** Selection toolbar (orange tint) shown when rows are selected. */
export function BulkActionBar({ count, avgRisk, onAssign, onTriage, onClear }: BulkActionBarProps) {
  return (
    <div className={styles.selectionBar}>
      <span className={styles.selCount}>{count} selected</span>
      <span className={styles.selMeta}>avg risk {avgRisk}</span>
      <div className={styles.selActions}>
        <Button size="sm" variant="secondary" onClick={onAssign}>
          Assign selected
        </Button>
        <Button size="sm" variant="primary" onClick={onTriage}>
          Mark as triaged
        </Button>
        <Button size="sm" variant="ghost" onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  )
}

const RISK_COLORS = (score: number): string =>
  score >= 85 ? '#ef4444' : score >= 70 ? '#ef7e00' : score >= 50 ? '#eab308' : '#9aa1ab'

/** Risk score cell: mini bar + mono value, color by threshold. */
export function RiskScoreCell({ score }: { score: number }) {
  return (
    <span className={styles.risk}>
      <span className={styles.riskTrack}>
        <span
          className={styles.riskFill}
          style={{ width: `${score}%`, background: RISK_COLORS(score) }}
        />
      </span>
      <span className={styles.riskValue}>{score}</span>
    </span>
  )
}

/** Absolute-position style for a virtualized row (framework-agnostic virtual-table helper). */
export function virtualRowStyle({ start, size }: { start: number; size: number }): CSSProperties {
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: size,
    transform: `translateY(${start}px)`
  }
}
