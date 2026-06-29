import { Button } from '../components/Button'
import styles from './States.module.css'

export type ErrorStateProps = {
  title?: string
  message?: string
  /** Optional request id from the `ApiError` envelope, shown for support/debugging. */
  requestId?: string
  onRetry?: () => void
}

/** Full-surface global error state with an optional retry. */
export function ErrorState({
  title = 'Something went wrong',
  message = 'This screen could not be loaded. Please try again.',
  requestId,
  onRetry
}: ErrorStateProps) {
  return (
    <div className={styles.error} role="alert">
      <p className={styles.title}>{title}</p>
      <p className={styles.message}>{message}</p>
      {requestId ? <p className={styles.message}>Request ID: {requestId}</p> : null}
      {onRetry ? (
        <Button variant="primary" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  )
}
