import type { ServiceStatus } from '@signalops/contracts'
import { Badge } from '../badges/Badge'
import type { HueName } from '@signalops/ui-spec'
import styles from './Charts.module.css'

const STATUS_META: Record<ServiceStatus['status'], { label: string; hue: HueName; dot: string }> = {
  operational: { label: 'Operational', hue: 'green', dot: '#12b76a' },
  degraded: { label: 'Degraded', hue: 'amber', dot: '#d9a200' },
  down: { label: 'Down', hue: 'red', dot: '#d92d20' }
}

/** Service rows with a status dot + text badge (meaning never by color alone). */
export function StatusList({ items }: { items: ServiceStatus[] }) {
  return (
    <div>
      {items.map((item) => {
        const meta = STATUS_META[item.status]
        return (
          <div key={item.name} className={styles.statusRow}>
            <span className={styles.statusName}>
              <span
                className={styles.statusDot}
                style={{ background: meta.dot }}
                aria-hidden="true"
              />
              {item.name}
            </span>
            <Badge hue={meta.hue}>{meta.label}</Badge>
          </div>
        )
      })}
    </div>
  )
}
