import { useState } from 'react'
import styles from './Ops.module.css'

/** A monospace request-id pill with a copy button. The status text is announced via aria-live so the
 *  copy action is perceivable without color. */
export function RequestIdBadge({ requestId }: { requestId: string }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    const clipboard = navigator.clipboard
    if (!clipboard) return
    clipboard.writeText(requestId).then(
      () => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
      },
      () => setCopied(false)
    )
  }

  return (
    <span className={styles.reqId}>
      <code className={styles.reqIdValue}>{requestId}</code>
      <button
        type="button"
        className={styles.reqIdCopy}
        onClick={copy}
        aria-label={`Copy request id ${requestId}`}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
      <span className={styles.srOnly} role="status" aria-live="polite">
        {copied ? 'Request id copied to clipboard' : ''}
      </span>
    </span>
  )
}
