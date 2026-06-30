import styles from './Charts.module.css'

export type TimelineItem = {
  title: string
  description?: string
  time?: string
  color?: string
}

/** Vertical event timeline with status dots. */
export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className={styles.timeline}>
      {items.map((item, index) => (
        <li key={`${item.title}-${index}`} className={styles.tlItem}>
          <span
            className={styles.tlDot}
            style={{ background: item.color ?? '#9aa1ab' }}
            aria-hidden="true"
          />
          <div className={styles.tlTitle}>{item.title}</div>
          {item.description ? <div className={styles.tlDesc}>{item.description}</div> : null}
          {item.time ? <div className={styles.tlTime}>{item.time}</div> : null}
        </li>
      ))}
    </ol>
  )
}
