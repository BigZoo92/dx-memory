import styles from './ConfidenceDisplay.module.css'

type Band = 'low' | 'medium' | 'high' | 'unavailable'

// Banding thresholds mirror @signalops/flow-domain `normalizeConfidence`. They are duplicated
// here (not imported) so flow-ui stays decoupled from the domain layer; the values are tiny and
// covered by tests on both sides.
function band(confidence: number | null): Band {
  if (confidence === null || Number.isNaN(confidence)) return 'unavailable'
  if (confidence >= 0.66) return 'high'
  if (confidence >= 0.33) return 'medium'
  return 'low'
}

const LABELS: Record<Band, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  unavailable: 'Unavailable'
}

export type ConfidenceDisplayProps = {
  confidence: number | null
  /**
   * `table` shows the compact "Unavailable"; `detail` shows the full "Confidence unavailable."
   * sentence required on the signal detail screen.
   */
  mode?: 'table' | 'detail'
}

/**
 * Renders model confidence as a dot + label. When confidence is `null` it shows the
 * "Unavailable" / "Confidence unavailable." state — it never crashes or renders a number.
 */
export function ConfidenceDisplay({ confidence, mode = 'table' }: ConfidenceDisplayProps) {
  const b = band(confidence)
  const label = b === 'unavailable' && mode === 'detail' ? 'Confidence unavailable.' : LABELS[b]
  return (
    <span className={`${styles.wrap} ${styles[b]}`}>
      <span className={styles.dot} aria-hidden="true" />
      {label}
    </span>
  )
}
