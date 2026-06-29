import type { ReactNode } from 'react'
import styles from './PageHeader.module.css'

export type PageHeaderProps = {
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
}

/** Screen title + subtitle + trailing actions (date range, export, pills…). */
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className={styles.header}>
      <div>
        <h1 className={styles.title}>{title}</h1>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  )
}
