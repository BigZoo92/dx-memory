import { RequestIdBadge } from './RequestIdBadge'
import type { OpsLevel, OpsLogRow } from './types'
import styles from './Ops.module.css'

const LEVEL_LABEL: Record<OpsLevel, string> = {
  debug: 'Debug',
  info: 'Info',
  warn: 'Warn',
  error: 'Error',
  fatal: 'Fatal'
}

const LEVEL_CLASS: Record<OpsLevel, string> = {
  debug: 'levelDebug',
  info: 'levelInfo',
  warn: 'levelWarn',
  error: 'levelError',
  fatal: 'levelFatal'
}

function formatTime(iso: string): string {
  const time = Date.parse(iso)
  return Number.isNaN(time) ? iso : new Date(time).toLocaleTimeString()
}

/** The error inbox: grouped log rows with a real `<th scope>` header so the table stays accessible. */
export function ErrorInboxTable({ rows }: { rows: readonly OpsLogRow[] }) {
  if (rows.length === 0) {
    return <p className={styles.empty}>No errors captured yet. Trigger a demo error from Settings.</p>
  }
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Level</th>
            <th scope="col">Message</th>
            <th scope="col">Route</th>
            <th scope="col">Status</th>
            <th scope="col">Request ID</th>
            <th scope="col">Count</th>
            <th scope="col">Last seen</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <span className={`${styles.level} ${styles[LEVEL_CLASS[row.level]]}`}>
                  {LEVEL_LABEL[row.level]}
                </span>
              </td>
              <td className={styles.message}>
                {row.message}
                {row.errorTag ? <span className={styles.tag}>{row.errorTag}</span> : null}
              </td>
              <td className={styles.mono}>{row.route ?? '-'}</td>
              <td className={styles.mono}>{row.status ?? '-'}</td>
              <td>{row.requestId ? <RequestIdBadge requestId={row.requestId} /> : '-'}</td>
              <td>{row.count}</td>
              <td className={styles.mono}>{formatTime(row.lastAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
