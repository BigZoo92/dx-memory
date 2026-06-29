import type { ReactNode } from 'react'
import styles from './States.module.css'

export type EmptyStateProps = {
  /** Default matches the canonical microcopy "No signals match your current filters." */
  message?: string
  title?: string
  action?: ReactNode
}

/** Empty result state with an optional recovery action (e.g. Reset filters). */
export function EmptyState({
  message = 'No signals match your current filters.',
  title,
  action
}: EmptyStateProps) {
  return (
    <div className={styles.empty} role="status">
      {title ? <p className={styles.title}>{title}</p> : null}
      <p className={styles.message}>{message}</p>
      {action}
    </div>
  )
}
