import styles from './VariantBadge.module.css'

/**
 * The single variant pill — the ONLY visible difference allowed between variants.
 * Its text is driven by one config value passed in by the app (`Variant B — Flow`).
 */
export function VariantBadge({ label }: { label: string }) {
  return (
    <span className={styles.badge}>
      <span className={styles.dot} aria-hidden="true" />
      {label}
    </span>
  )
}
