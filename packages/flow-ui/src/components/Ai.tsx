import type { ReactNode } from 'react'
import styles from './Ai.module.css'

export type AiCardProps = {
  title?: string
  children: ReactNode
  actions?: ReactNode
}

/** Orange-tint AI summary/recommendation card, tagged "mock" (the data is illustrative). */
export function AiCard({ title = 'AI summary', children, actions }: AiCardProps) {
  return (
    <div className={styles.aiCard}>
      <div className={styles.aiHead}>
        <span className={styles.aiTitle}>{title}</span>
        <span className={styles.mockTag}>mock</span>
      </div>
      <p className={styles.aiBody}>{children}</p>
      {actions ? <div className={styles.aiActions}>{actions}</div> : null}
    </div>
  )
}

export type RecommendedActionProps = {
  /** `critical` renders the red treatment; everything else uses amber. */
  severity: 'critical' | string
  title: string
  detail?: string
}

/** Severity-aware recommendation callout (red for critical, amber otherwise). */
export function RecommendedAction({ severity, title, detail }: RecommendedActionProps) {
  const tone = severity === 'critical' ? styles.critical : styles.default
  return (
    <div className={`${styles.callout} ${tone}`} role="note">
      <p className={styles.calloutTitle}>{title}</p>
      {detail ? <p className={styles.calloutDetail}>{detail}</p> : null}
    </div>
  )
}
