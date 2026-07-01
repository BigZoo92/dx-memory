import type { CSSProperties } from 'react'

// Line icons for the shell and buttons. Paths copied from the shared reference (duplicated here).
export type IconName =
  | 'overview'
  | 'signals'
  | 'incidents'
  | 'compare'
  | 'dx-metrics'
  | 'settings'
  | 'clock'
  | 'search'
  | 'reset'
  | 'check'
  | 'chevron-down'
  | 'bell'
  | 'export'

const PATHS: Record<IconName, { d?: string[]; rect?: number[][]; circle?: number[][] }> = {
  overview: {
    rect: [
      [3, 3, 7, 7],
      [14, 3, 7, 7],
      [14, 14, 7, 7],
      [3, 14, 7, 7]
    ]
  },
  signals: { d: ['M22 12h-4l-3 9L9 3l-3 9H2'] },
  incidents: {
    d: [
      'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
      'M12 9v4',
      'M12 17h.01'
    ]
  },
  compare: { d: ['M8 3 4 7l4 4', 'M4 7h13', 'M16 21l4-4-4-4', 'M20 17H7'] },
  'dx-metrics': { d: ['M3 3v18h18', 'M7 15v-4', 'M12 15V8', 'M17 15v-6'] },
  settings: {
    d: ['M21 5H10', 'M6 5H3', 'M21 12h-7', 'M10 12H3', 'M21 19h-3', 'M14 19H3'],
    circle: [
      [8, 5, 2],
      [12, 12, 2],
      [16, 19, 2]
    ]
  },
  clock: { d: ['M12 7v5l3 2'], circle: [[12, 12, 9]] },
  search: { d: ['m21 21-4.3-4.3'], circle: [[11, 11, 8]] },
  reset: { d: ['M3 2v6h6', 'M3.5 12a9 9 0 1 0 2.6-5.8L3 8'] },
  check: { d: ['M20 6 9 17l-5-5'] },
  'chevron-down': { d: ['m6 9 6 6 6-6'] },
  bell: { d: ['M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9', 'M13.7 21a2 2 0 0 1-3.4 0'] },
  export: { d: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'] }
}

export function Icon({
  name,
  size = 18,
  className,
  style
}: {
  name: IconName
  size?: number
  className?: string
  style?: CSSProperties
}) {
  const spec = PATHS[name]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {spec.rect?.map((r, i) => (
        <rect key={`r${i}`} x={r[0]} y={r[1]} width={r[2]} height={r[3]} rx={1.5} />
      ))}
      {spec.circle?.map((c, i) => <circle key={`c${i}`} cx={c[0]} cy={c[1]} r={c[2]} />)}
      {spec.d?.map((d, i) => <path key={`p${i}`} d={d} />)}
    </svg>
  )
}
