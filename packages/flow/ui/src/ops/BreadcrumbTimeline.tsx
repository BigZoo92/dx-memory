import type { OpsBreadcrumb } from './types'
import styles from './Ops.module.css'

function formatTime(iso: string): string {
  const time = Date.parse(iso)
  return Number.isNaN(time) ? iso : new Date(time).toLocaleTimeString()
}

/** A light vertical timeline of recent breadcrumbs leading up to the current state. */
export function BreadcrumbTimeline({ items }: { items: readonly OpsBreadcrumb[] }) {
  if (items.length === 0) {
    return <p className={styles.empty}>No breadcrumbs recorded yet.</p>
  }
  return (
    <ol className={styles.timeline}>
      {items.map((crumb, index) => (
        <li key={`${crumb.timestamp}-${index}`} className={styles.timelineItem}>
          <span className={styles.timelineTime}>{formatTime(crumb.timestamp)}</span>
          <span className={styles.timelineCategory}>{crumb.category}</span>
          <span className={styles.timelineMessage}>{crumb.message}</span>
        </li>
      ))}
    </ol>
  )
}
