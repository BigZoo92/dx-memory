import type { ReactNode } from 'react'
import type { HueName } from '@signalops/ui-spec'
import styles from './Badge.module.css'

export type BadgeProps = {
  hue: HueName
  children: ReactNode
  /** Show a leading status dot (still accompanied by the text label). */
  withDot?: boolean
}

/**
 * Base pill badge. Meaning is carried by the text label AND a hue — never by color alone
 * (accessibility baseline). The optional dot is decorative.
 */
export function Badge({ hue, children, withDot = false }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[hue]}`}>
      {withDot ? <span className={styles.dot} aria-hidden="true" /> : null}
      {children}
    </span>
  )
}
