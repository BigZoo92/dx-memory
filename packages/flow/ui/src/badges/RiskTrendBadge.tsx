import type { RiskTrend } from '@signalops/contracts'
import type { HueName } from '@signalops/ui-spec'
import { Badge } from './Badge'

/**
 * Risk-trend pill for the cross-variant "Risk trend" capability. Rising risk is bad (red),
 * falling risk is good (green), stable is neutral (grey). The arrow is decorative — meaning
 * is always carried by the text label (accessibility baseline, same as every other badge).
 */
const TRENDS: Record<RiskTrend, { label: string; arrow: string; hue: HueName }> = {
  up: { label: 'Rising', arrow: '▲', hue: 'red' },
  stable: { label: 'Stable', arrow: '▬', hue: 'grey' },
  down: { label: 'Falling', arrow: '▼', hue: 'green' }
}

export function RiskTrendBadge({ trend }: { trend: RiskTrend }) {
  const meta = TRENDS[trend]
  return (
    <Badge hue={meta.hue}>
      <span aria-hidden="true">{meta.arrow}</span> {meta.label}
    </Badge>
  )
}
