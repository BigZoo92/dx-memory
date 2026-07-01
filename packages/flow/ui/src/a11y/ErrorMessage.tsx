import type { ReactNode } from 'react'
import styles from './A11y.module.css'

/** An accessible form-field error. Pair its `id` with the input's `aria-describedby`/`aria-invalid`. */
export function ErrorMessage({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className={styles.errorMessage}>
      {children}
    </p>
  )
}
