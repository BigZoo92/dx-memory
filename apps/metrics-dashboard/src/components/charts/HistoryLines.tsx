import { history } from '../../data'
import type { HistoryPoint, VariantId } from '../../types'
import { VARIANT_COLOR, VARIANT_LABEL } from '../../lib/theme'
import { useWidth } from './base'
import { useTip } from '../ui'
import { shortTime, formatDuration } from '../../lib/format'

const VARIANT_ORDER: VariantId[] = ['flow', 'friction', 'overfit']

type Series = { id: string; color: string; label: string; values: (number | null)[] }

/** One small line chart. `series` share the same x-axis (the history points). */
function Spark({ title, unit, series, points, fmt }: { title: string; unit?: string; series: Series[]; points: HistoryPoint[]; fmt?: (v: number) => string }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const { show, hide } = useTip()
  const padL = 8
  const padR = 8
  const top = 10
  const h = 96
  const height = top + h + 6
  const plotW = Math.max(80, width - padL - padR)
  const all = series.flatMap((s) => s.values).filter((v): v is number => v != null)
  if (all.length === 0) return null
  const min = Math.min(...all)
  const max = Math.max(...all)
  const span = max - min || 1
  const n = points.length
  const x = (i: number) => padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW)
  const y = (v: number) => top + h - ((v - min) / span) * h

  const pathFor = (vals: (number | null)[]) => {
    let d = ''
    vals.forEach((v, i) => {
      if (v == null) return
      d += `${d && !d.endsWith('M') ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)} `
    })
    return d.trim()
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="between" style={{ marginBottom: 6 }}>
        <span className="tiny" style={{ color: 'var(--ink)' }}>{title}</span>
        <span className="tiny muted mono">{fmt ? fmt(series[series.length - 1].values.filter((v): v is number => v != null).at(-1) ?? max) : `${max}${unit ?? ''}`}</span>
      </div>
      <div ref={ref}>
        <svg width="100%" height={height} viewBox={`0 0 ${Math.max(width, 200)} ${height}`} role="img" aria-label={title}>
          {series.map((s) => (
            <g key={s.id}>
              <path d={pathFor(s.values)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {s.values.map((v, i) =>
                v == null ? null : (
                  <circle
                    key={i}
                    cx={x(i)}
                    cy={y(v)}
                    r={2.6}
                    fill={s.color}
                    onMouseMove={(e) =>
                      show(
                        <div>
                          <div className="tt-title">{s.label}</div>
                          <div className="tt-row"><span>value</span><span className="v">{fmt ? fmt(v) : `${v}${unit ?? ''}`}</span></div>
                          <div className="tt-row"><span>at</span><span className="v">{shortTime(points[i].at)}</span></div>
                        </div>,
                        e
                      )
                    }
                    onMouseLeave={hide}
                  />
                )
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}

/**
 * History trends across collector runs: headline delivery score per variant, Ship score per
 * variant, CI wall time, and Flow's gzip bundle. Renders whatever exists — a single point is
 * shown as a dot. Needs ≥ 1 committed history snapshot to be interesting.
 */
export function HistoryLines() {
  const points = history
  if (points.length < 2) {
    return (
      <p className="chart-note">
        Only {points.length} snapshot{points.length === 1 ? '' : 's'} collected so far — trends appear once the metrics
        workflow has run a few times (each run writes an immutable snapshot to <code className="mono">results/history/</code>).
      </p>
    )
  }
  const variantSeries = (pick: (p: HistoryPoint) => Record<VariantId, number | null>): Series[] =>
    VARIANT_ORDER.map((id) => ({
      id,
      color: VARIANT_COLOR[id].mark,
      label: VARIANT_LABEL[id],
      values: points.map((p) => pick(p)[id])
    }))

  return (
    <div className="grid cols-2">
      <Spark title="Total Delivery Score" series={variantSeries((p) => p.totalDeliveryScore)} points={points} fmt={(v) => v.toFixed(0)} />
      <Spark title="Ship score" series={variantSeries((p) => p.shipScore)} points={points} fmt={(v) => v.toFixed(0)} />
      <Spark
        title="CI wall time (avg)"
        series={[{ id: 'ci', color: '#e8b339', label: 'CI wall time', values: points.map((p) => p.ciWallTimeMs) }]}
        points={points}
        fmt={(v) => formatDuration(v)}
      />
      <Spark
        title="Flow bundle (gzip)"
        series={[{ id: 'bundle', color: VARIANT_COLOR.flow.mark, label: 'Flow gzip bundle', values: points.map((p) => p.flowBundleGzipKb) }]}
        points={points}
        fmt={(v) => `${v} KB`}
      />
    </div>
  )
}
