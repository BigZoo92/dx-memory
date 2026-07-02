import { variants, AXES } from '../../data'
import type { VariantId } from '../../types'
import { VARIANT_COLOR, VARIANT_LABEL } from '../../lib/theme'
import { useWidth } from './base'
import { useTip } from '../ui'

/**
 * The four delivery axes as dot-plot tracks (0–100). Each variant is a dot on each track;
 * the winner glows. Axes that couldn't be measured for a variant render a hollow "pending"
 * dot in the left gutter — visually distinct from a real low score.
 */
export function AxisTracks() {
  const [ref, width] = useWidth<HTMLDivElement>()
  const { show, hide } = useTip()
  const padL = 92
  const padR = 24
  const rowH = 66
  const top = 26
  const plotW = Math.max(120, width - padL - padR)
  const height = top + AXES.length * rowH + 14
  const x = (s: number) => padL + (s / 100) * plotW

  return (
    <div ref={ref}>
      <svg width="100%" height={height} viewBox={`0 0 ${Math.max(width, 320)} ${height}`} role="img" aria-label="Delivery axis scores">
        {/* scale ticks */}
        {[0, 25, 50, 75, 100].map((t) => (
          <g key={t}>
            <line className="grid-line" x1={x(t)} x2={x(t)} y1={top - 6} y2={top + AXES.length * rowH - 20} />
            <text className="axis-label" x={x(t)} y={top - 12} textAnchor="middle">
              {t}
            </text>
          </g>
        ))}
        {AXES.map((axis, i) => {
          const key = axis.toLowerCase()
          const cy = top + i * rowH + rowH / 2 - 6
          const scored = variants
            .map((v) => ({ id: v.meta.variant as VariantId, s: v.scores[key] }))
            .filter((d) => d.s?.value != null)
          const best = scored.slice().sort((a, b) => (b.s!.value! - a.s!.value!))[0]
          return (
            <g key={axis}>
              <text x={0} y={cy + 4} className="axis-label" style={{ fontSize: 13, fill: 'var(--ink)' }}>
                {axis}
              </text>
              <line className="grid-line" x1={padL} x2={padL + plotW} y1={cy} y2={cy} />
              {/* connector between measured dots */}
              {scored.length > 1 && (
                <line
                  x1={x(Math.min(...scored.map((d) => d.s!.value!)))}
                  x2={x(Math.max(...scored.map((d) => d.s!.value!)))}
                  y1={cy}
                  y2={cy}
                  stroke="var(--hair-strong)"
                  strokeWidth={2}
                />
              )}
              {variants.map((v) => {
                const id = v.meta.variant as VariantId
                const sc = v.scores[key]
                const c = VARIANT_COLOR[id]
                const isBest = best?.id === id
                if (sc?.value == null) {
                  // pending marker in the gutter
                  const gx = padL - 20
                  return (
                    <g
                      key={id}
                      onMouseMove={(e) =>
                        show(
                          <div>
                            <div className="tt-title">
                              {VARIANT_LABEL[id]} · {axis}
                            </div>
                            <div className="tt-row">
                              <span>status</span>
                              <span className="v">pending</span>
                            </div>
                            <div className="muted tiny" style={{ marginTop: 4, maxWidth: 200 }}>
                              {sc?.gated
                                ? 'not enough measured signal on this axis yet (timings / runtime pass 2)'
                                : 'not measured'}
                            </div>
                          </div>,
                          e
                        )
                      }
                      onMouseLeave={hide}
                    >
                      <circle cx={gx} cy={cy} r={5} fill="none" stroke={c.mark} strokeDasharray="2 2" opacity={0.7} />
                    </g>
                  )
                }
                return (
                  <g
                    key={id}
                    style={{ cursor: 'default' }}
                    onMouseMove={(e) =>
                      show(
                        <div>
                          <div className="tt-title">
                            {VARIANT_LABEL[id]} · {axis}
                          </div>
                          <div className="tt-row">
                            <span>score</span>
                            <span className="v">{sc.value!.toFixed(0)} / 100</span>
                          </div>
                          <div className="tt-row">
                            <span>coverage</span>
                            <span className="v">{sc.coverage ?? '—'}</span>
                          </div>
                        </div>,
                        e
                      )
                    }
                    onMouseLeave={hide}
                  >
                    {isBest && <circle cx={x(sc.value!)} cy={cy} r={11} fill={c.soft} />}
                    <circle
                      cx={x(sc.value!)}
                      cy={cy}
                      r={isBest ? 7 : 5.5}
                      fill={isBest ? c.glow : c.mark}
                      stroke="var(--bg)"
                      strokeWidth={1.5}
                    />
                  </g>
                )
              })}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
