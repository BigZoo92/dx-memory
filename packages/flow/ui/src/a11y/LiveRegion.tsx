import styles from './A11y.module.css'

/** A visually-hidden polite/assertive live region for announcing dynamic status changes. */
export function LiveRegion({
  message,
  assertive = false
}: {
  message: string
  assertive?: boolean
}) {
  return (
    <div
      className={styles.srOnly}
      role="status"
      aria-live={assertive ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      {message}
    </div>
  )
}
