import styles from './Charts.module.css'

export type VariantBar = { key: string; label: string; value: number; current: boolean }

export type VariantBarsProps = {
  title: string
  bars: VariantBar[]
}

/** Grouped A/B/C comparison bars for one metric; the current variant's bar is highlighted. */
export function VariantBars({ title, bars }: VariantBarsProps) {
  const max = Math.max(1, ...bars.map((b) => b.value))
  return (
    <div className={styles.variantChart}>
      <span className={styles.variantTitle}>{title}</span>
      <div className={styles.bars}>
        {bars.map((bar) => (
          <div key={bar.key} className={styles.barCol}>
            <span className={styles.barTrack}>
              <span
                className={`${styles.bar} ${bar.current ? styles.barCurrent : ''}`}
                style={{ height: `${Math.max(6, (bar.value / max) * 86)}px` }}
                title={`${bar.key}: ${bar.label}`}
              />
            </span>
            <span className={`${styles.barName} ${bar.current ? styles.barNameCurrent : ''}`}>
              {bar.key}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
