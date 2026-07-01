import type { ReactNode } from 'react'
import styles from './A11y.module.css'

/** Keyboard skip link. Hidden until focused, then jumps focus to the main content landmark. */
export function SkipLink({
  targetId = 'main-content',
  children = 'Skip to main content'
}: {
  targetId?: string
  children?: ReactNode
}) {
  return (
    <a className={styles.skipLink} href={`#${targetId}`}>
      {children}
    </a>
  )
}
