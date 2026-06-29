import type { CSSProperties, ReactNode } from 'react'
import styles from './Card.module.css'

export type CardProps = {
  children: ReactNode
  padded?: boolean
  className?: string
  style?: CSSProperties
}

/** Generic white surface used everywhere (cards, panels, table containers). */
export function Card({ children, padded = true, className, style }: CardProps) {
  const classes = [styles.card, padded ? styles.padded : '', className ?? '']
    .filter(Boolean)
    .join(' ')
  return (
    <div className={classes} style={style}>
      {children}
    </div>
  )
}

/** Card header with a title, optional subtitle and trailing actions. */
export function CardHeader({
  title,
  subtitle,
  actions
}: {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className={styles.header}>
      <div>
        <h2 className={styles.title}>{title}</h2>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </div>
      {actions}
    </div>
  )
}
