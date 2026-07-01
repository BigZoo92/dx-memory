import type { ReactNode } from 'react'
import styles from './A11y.module.css'

/** Content available to screen readers but visually hidden (the exported primitive form of srOnly). */
export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className={styles.srOnly}>{children}</span>
}
