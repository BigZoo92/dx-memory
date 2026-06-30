import type { SeverityBreakdownEntry, SignalSeverity } from '@signalops/contracts'
import styles from './Charts.module.css'

const SEVERITY_META: Record<SignalSeverity, { label: string; dot: string; bar: string }> = {
  critical: { label: 'Critical', dot: '#d92d20', bar: '#ef4444' },
  high: { label: 'High', dot: '#ef7e00', bar: '#ef7e00' },
  medium: { label: 'Medium', dot: '#d9a200', bar: '#eab308' },
  low: { label: 'Low', dot: '#2563eb', bar: '#3b82f6' }
}

/** Horizontal distribution bars per severity (input is already ordered Critical → Low). */
export function SeverityBars({ data }: { data: SeverityBreakdownEntry[] }) {
  const max = Math.max(1, ...data.map((entry) => entry.count))
  return (
    <div>
      {data.map((entry) => {
        const meta = SEVERITY_META[entry.severity]
        return (
          <div key={entry.severity} className={styles.sevRow}>
            <span className={styles.sevLabel}>
              <span className={styles.sevDot} style={{ background: meta.dot }} aria-hidden="true" />
              {meta.label}
            </span>
            <span className={styles.sevTrack}>
              <span
                className={styles.sevFill}
                style={{ width: `${(entry.count / max) * 100}%`, background: meta.bar }}
              />
            </span>
            <span className={styles.sevCount}>{entry.count.toLocaleString()}</span>
          </div>
        )
      })}
    </div>
  )
}
