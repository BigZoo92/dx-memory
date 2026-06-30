import type { TimeseriesPoint } from '@signalops/contracts'

export type TrendChartProps = {
  points: TimeseriesPoint[]
  height?: number
}

/**
 * Lightweight SVG area+line chart: total signals (orange, filled) vs critical (red, line),
 * matching the reference "Signals over time". No chart library — scales computed from the data.
 */
export function TrendChart({ points, height = 190 }: TrendChartProps) {
  const width = 560
  const pad = 8
  const n = Math.max(points.length, 2)
  const max = Math.max(1, ...points.map((p) => p.total))

  const x = (i: number) => pad + i * ((width - pad * 2) / (n - 1))
  const y = (v: number) => height - 26 - (v / max) * (height - 44)
  const line = (key: 'total' | 'critical') =>
    points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(p[key]).toFixed(1)}`)
      .join(' ')

  const area = `${line('total')} L ${x(n - 1)} ${height - 26} L ${x(0)} ${height - 26} Z`
  const labelIdx = [0, Math.floor((n - 1) / 2), n - 1]

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: '100%', height }}
      role="img"
      aria-label="Signals over time"
    >
      <defs>
        <linearGradient id="so-trend-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef7e00" stopOpacity={0.18} />
          <stop offset="100%" stopColor="#ef7e00" stopOpacity={0} />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3].map((g) => (
        <line
          key={g}
          x1={pad}
          x2={width - pad}
          y1={26 + g * ((height - 52) / 3)}
          y2={26 + g * ((height - 52) / 3)}
          stroke="#f0f1f3"
          strokeWidth={1}
        />
      ))}
      <path d={area} fill="url(#so-trend-grad)" />
      <path
        d={line('total')}
        fill="none"
        stroke="#ef7e00"
        strokeWidth={2.2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d={line('critical')}
        fill="none"
        stroke="#d92d20"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {labelIdx.map((i, k) => (
        <text
          key={i}
          x={x(i)}
          y={height - 6}
          fontSize={10.5}
          fill="#a3aab4"
          textAnchor={k === 0 ? 'start' : k === labelIdx.length - 1 ? 'end' : 'middle'}
        >
          {points[i]?.date.slice(5)}
        </text>
      ))}
    </svg>
  )
}
