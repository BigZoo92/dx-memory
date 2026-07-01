import type { OpsCounters } from './types'
import styles from './Ops.module.css'

/** A compact grid of operational Run counters derived from the in-memory event store. */
export function RunHealthSummary({ counters }: { counters: OpsCounters }) {
  const coverage = `${Math.round(counters.requestIdCoverage * 100)}%`
  const cells: Array<{ label: string; value: string }> = [
    { label: 'Events', value: String(counters.total) },
    { label: 'Handled errors', value: String(counters.handledErrors) },
    { label: 'Unhandled', value: String(counters.unhandledErrors) },
    { label: 'Timeouts', value: String(counters.timeouts) },
    { label: 'Retries', value: String(counters.retries) },
    { label: 'requestId coverage', value: coverage },
    { label: 'Active alerts', value: String(counters.alertCount) }
  ]
  return (
    <div className={styles.summary}>
      {cells.map((cell) => (
        <div key={cell.label} className={styles.summaryCell}>
          <span className={styles.summaryValue}>{cell.value}</span>
          <span className={styles.summaryLabel}>{cell.label}</span>
        </div>
      ))}
    </div>
  )
}
