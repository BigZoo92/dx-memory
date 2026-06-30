import type { ReactNode } from 'react'
import { Button } from '../components/Button'
import styles from './States.module.css'

export type BannerTone = 'warning' | 'danger' | 'success' | 'info'

export type BannerProps = {
  tone?: BannerTone
  children: ReactNode
  onRetry?: () => void
  retryLabel?: string
}

/** Inline banner for simulation results and partial-error notices. */
export function Banner({ tone = 'info', children, onRetry, retryLabel = 'Retry' }: BannerProps) {
  return (
    <div className={`${styles.banner} ${styles[tone]}`} role="status">
      <span className={styles.bannerDot} aria-hidden="true" />
      <span className={styles.bannerText}>{children}</span>
      {onRetry ? (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  )
}

/**
 * Partial-error notice — a non-blocking banner with the canonical microcopy and Retry,
 * shown when some widgets fail while the rest of the page stays usable.
 */
export function PartialError({ onRetry }: { onRetry?: () => void }) {
  return (
    <Banner tone="warning" onRetry={onRetry}>
      Some widgets could not be refreshed.
    </Banner>
  )
}
