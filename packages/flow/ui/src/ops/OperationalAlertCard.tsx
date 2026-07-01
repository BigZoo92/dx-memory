import type { OpsAlert, OpsAlertSeverity } from './types'
import styles from './Ops.module.css'

const SEVERITY_LABEL: Record<OpsAlertSeverity, string> = {
  critical: 'Critical',
  warning: 'Warning',
  'product-impact': 'Product impact',
  'demo-only': 'Demo only'
}

const SEVERITY_CLASS: Record<OpsAlertSeverity, string> = {
  critical: 'alertCritical',
  warning: 'alertWarning',
  'product-impact': 'alertImpact',
  'demo-only': 'alertDemo'
}

/** A single operational alert. Severity is carried by a text label AND a class (never color alone). */
export function OperationalAlertCard({ alert }: { alert: OpsAlert }) {
  return (
    <div className={`${styles.alert} ${styles[SEVERITY_CLASS[alert.severity]]}`}>
      <div className={styles.alertHead}>
        <span className={styles.alertSeverity}>{SEVERITY_LABEL[alert.severity]}</span>
        <span className={styles.alertTitle}>{alert.title}</span>
        <span className={styles.alertCount}>{alert.count}x</span>
      </div>
      <p className={styles.alertMessage}>{alert.message}</p>
    </div>
  )
}
