import { scaleLinear } from 'd3-scale'
import { summary, variants } from '../../data'
import type { VariantId } from '../../types'
import { VARIANT_COLOR, VARIANT_LABEL } from '../../lib/theme'
import { useWidth } from './base'
import { useTip } from '../ui'

/**
 * The thesis in one chart. X = apparent leanness (smaller bundle scores higher — "looks
 * cheap"). Y = change safety (the Change axis score). The winner is the variant that is
 * safe to change without being seduced by raw smallness. Friction lands bottom-right (lean
 * but risky); Flow lands high (safe), which is what actually controls lifetime cost.
 */
export function PositioningPlot() {
  const [ref, width] = useWidth<HTMLDivElement>()
  const { show, hide } = useTip()
  const h = 380
  const m = { t: 26, r: 30, b: 52, l: 62 }
  const w = Math.max(280, width)
  const x = scaleLinear().domain([0, 100]).range([m.l, w - m.r])
  const y = scaleLinear().domain([0, 100]).range([h - m.b, m.t])

  const pts = variants.map((v) => {
    const id = v.meta.variant as VariantId
    return {
      id,
      lean: summary.normScores.bundleJsGzipKb?.[id] ?? 0,
      safe: v.scores.change?.value ?? 0,
      total: v.scores.totalDeliveryScore?.value ?? 0
    }
  })

  return (
    <div ref={ref}>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Leanness versus change safety">
        {/* sweet-spot band (high change safety) */}
        <rect x={m.l} y={m.t} width={w - m.r - m.l} height={y(66) - m.t} fill="rgba(46,230,191,0.05)" />
        <text x={w - m.r - 8} y={m.t + 16} textAnchor="end" className="axis-label" style={{ fill: 'var(--flow)' }}>
          safe-to-change zone
        </text>
        {/* grid */}
        {[0, 25, 50, 75, 100].map((t) => (
          <g key={t}>
            <line className="grid-line" x1={x(t)} x2={x(t)} y1={m.t} y2={h - m.b} opacity={0.5} />
            <line className="grid-line" x1={m.l} x2={w - m.r} y1={y(t)} y2={y(t)} opacity={0.5} />
            <text className="axis-label" x={x(t)} y={h - m.b + 16} textAnchor="middle">
              {t}
            </text>
            <text className="axis-label" x={m.l - 10} y={y(t) + 4} textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        {/* axis titles */}
        <text x={(m.l + w - m.r) / 2} y={h - 8} textAnchor="middle" className="axis-label" style={{ fill: 'var(--ink-2)' }}>
          Apparent leanness →  (smaller bundle "looks cheaper")
        </text>
        <text
          transform={`translate(16, ${(m.t + h - m.b) / 2}) rotate(-90)`}
          textAnchor="middle"
          className="axis-label"
          style={{ fill: 'var(--ink-2)' }}
        >
          Change safety ↑
        </text>
        {pts.map((p) => {
          const c = VARIANT_COLOR[p.id]
          const r = 16 + (p.total / 100) * 20
          const isFlow = p.id === 'flow'
          return (
            <g
              key={p.id}
              style={{ cursor: 'default' }}
              onMouseMove={(e) =>
                show(
                  <div>
                    <div className="tt-title">{VARIANT_LABEL[p.id]}</div>
                    <div className="tt-row">
                      <span>change safety</span>
                      <span className="v">{p.safe.toFixed(0)}</span>
                    </div>
                    <div className="tt-row">
                      <span>apparent leanness</span>
                      <span className="v">{p.lean.toFixed(0)}</span>
                    </div>
                    <div className="tt-row">
                      <span>delivery score</span>
                      <span className="v">{p.total.toFixed(1)}</span>
                    </div>
                  </div>,
                  e
                )
              }
              onMouseLeave={hide}
            >
              <circle cx={x(p.lean)} cy={y(p.safe)} r={r} fill={c.soft} stroke={c.mark} strokeWidth={isFlow ? 2 : 1.2} />
              <circle cx={x(p.lean)} cy={y(p.safe)} r={4} fill={c.glow} />
              <text
                x={x(p.lean)}
                y={y(p.safe) - r - 8}
                textAnchor="middle"
                style={{ fill: c.glow, fontSize: 13, fontWeight: 640 }}
              >
                {VARIANT_LABEL[p.id]}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
