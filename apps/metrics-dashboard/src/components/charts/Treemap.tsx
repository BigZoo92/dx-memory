import { hierarchy, treemap } from 'd3-hierarchy'
import { variant } from '../../data'
import type { VariantId } from '../../types'
import { VARIANT_COLOR, VARIANT_LABEL } from '../../lib/theme'
import { useWidth } from './base'
import { useTip } from '../ui'
import { fmtNum } from '../../lib/format'

/**
 * Bundle composition treemap — one box per emitted JS chunk, area ∝ raw KB. Reveals whether
 * a variant ships one monolithic chunk (poor code-splitting) or a spread of smaller ones.
 */
export function BundleTreemap({ id }: { id: VariantId }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const { show, hide } = useTip()
  const v = variant(id)
  const c = VARIANT_COLOR[id]
  const h = 240
  const w = Math.max(240, width)
  const chunks = v.topChunks

  if (!chunks.length) {
    return (
      <div ref={ref} className="card" style={{ height: h, display: 'grid', placeItems: 'center' }}>
        <span className="pending tiny">no build output — chunk map pending</span>
      </div>
    )
  }

  type TreeDatum = { name?: string; kb?: number; gzipKb?: number; children?: typeof chunks }
  const root = hierarchy<TreeDatum>({ children: chunks })
    .sum((d) => d.kb ?? 0)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
  treemap<TreeDatum>().size([w, h]).paddingInner(3).round(true)(root)

  const leaves = root.leaves() as unknown as Array<{
    x0: number
    x1: number
    y0: number
    y1: number
    data: { name: string; kb: number; gzipKb: number }
  }>

  return (
    <div ref={ref}>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${VARIANT_LABEL[id]} bundle chunks`}>
        {leaves.map((l, i) => {
          const bw = l.x1 - l.x0
          const bh = l.y1 - l.y0
          const big = bw > 62 && bh > 30
          return (
            <g
              key={i}
              style={{ cursor: 'default' }}
              onMouseMove={(e) =>
                show(
                  <div>
                    <div className="tt-title mono" style={{ fontSize: 11 }}>
                      {l.data.name}
                    </div>
                    <div className="tt-row">
                      <span>raw</span>
                      <span className="v">{fmtNum(l.data.kb)} KB</span>
                    </div>
                    <div className="tt-row">
                      <span>gzip</span>
                      <span className="v">{fmtNum(l.data.gzipKb)} KB</span>
                    </div>
                  </div>,
                  e
                )
              }
              onMouseLeave={hide}
            >
              <rect
                x={l.x0}
                y={l.y0}
                width={Math.max(0, bw)}
                height={Math.max(0, bh)}
                rx={4}
                fill={i === 0 ? c.mark : c.soft}
                stroke={c.mark}
                strokeOpacity={0.5}
              />
              {big && (
                <>
                  <text x={l.x0 + 8} y={l.y0 + 18} style={{ fill: 'var(--ink)', fontSize: 11, fontWeight: 600 }}>
                    {fmtNum(l.data.kb)} KB
                  </text>
                  <text x={l.x0 + 8} y={l.y0 + 33} className="mono" style={{ fill: 'var(--ink-3)', fontSize: 9.5 }}>
                    {l.data.name.length > 16 ? `${l.data.name.slice(0, 15)}…` : l.data.name}
                  </text>
                </>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
