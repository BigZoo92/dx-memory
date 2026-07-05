import { useMemo, useState } from 'react'
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, forceX, forceY } from 'd3-force'
import { variant } from '../../data'
import type { VariantId } from '../../types'
import { VARIANT_COLOR, VARIANT_LABEL } from '../../lib/theme'
import { useWidth } from './base'
import { useTip } from '../ui'

type SimNode = {
  id: string
  short: string
  kind: 'npm' | 'rust'
  fanIn: number
  fanOut: number
  x: number
  y: number
}
type SimLink = { source: SimNode; target: SimNode }

/**
 * Force-directed view of a variant's internal project graph. Node radius ∝ fan-in (how many
 * projects depend on it = change blast radius); Rust crates and npm packages are shape-coded.
 * The simulation is run to rest once (deterministic, no animation loop) for performance.
 */
export function ForceGraph({ id, height = 440 }: { id: VariantId; height?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const { show, hide } = useTip()
  const [hover, setHover] = useState<string | null>(null)
  const v = variant(id)
  const c = VARIANT_COLOR[id]
  const h = height
  const w = Math.max(300, width)

  const { nodes, links } = useMemo(() => {
    const ns: SimNode[] = v.graph.nodes.map((n) => ({ ...n, x: w / 2, y: h / 2 }))
    const byId = new Map(ns.map((n) => [n.id, n]))
    const ls: SimLink[] = v.graph.edges
      .map((e) => ({ source: byId.get(e.source)!, target: byId.get(e.target)! }))
      .filter((e) => e.source && e.target)
    const sim = forceSimulation<SimNode>(ns)
      .force('link', forceLink<SimNode, SimLink>(ls).id((d) => d.id).distance(58).strength(0.5))
      .force('charge', forceManyBody<SimNode>().strength(ns.length > 20 ? -170 : -260))
      .force('center', forceCenter(w / 2, h / 2))
      .force('x', forceX<SimNode>(w / 2).strength(0.06))
      .force('y', forceY<SimNode>(h / 2).strength(0.08))
      .force('collide', forceCollide<SimNode>(22))
      .stop()
    for (let i = 0; i < 320; i++) sim.tick()
    // clamp into viewport
    const pad = 26
    for (const n of ns) {
      n.x = Math.max(pad, Math.min(w - pad, n.x))
      n.y = Math.max(pad, Math.min(h - pad, n.y))
    }
    return { nodes: ns, links: ls }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, w])

  const neighbors = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const l of links) {
      if (!map.has(l.source.id)) map.set(l.source.id, new Set())
      if (!map.has(l.target.id)) map.set(l.target.id, new Set())
      map.get(l.source.id)!.add(l.target.id)
      map.get(l.target.id)!.add(l.source.id)
    }
    return map
  }, [links])

  const rOf = (n: SimNode) => 5 + Math.sqrt(n.fanIn) * 3.4
  const dim = (nid: string) => hover != null && hover !== nid && !neighbors.get(hover)?.has(nid)

  return (
    <div ref={ref}>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${VARIANT_LABEL[id]} project graph`}>
        {links.map((l, i) => {
          const active = hover === l.source.id || hover === l.target.id
          return (
            <line
              key={i}
              x1={l.source.x}
              y1={l.source.y}
              x2={l.target.x}
              y2={l.target.y}
              stroke={active ? c.glow : 'var(--hair-strong)'}
              strokeWidth={active ? 1.6 : 1}
              opacity={hover && !active ? 0.15 : 0.6}
            />
          )
        })}
        {nodes.map((n) => {
          const r = rOf(n)
          const isRust = n.kind === 'rust'
          const faded = dim(n.id)
          return (
            <g
              key={n.id}
              transform={`translate(${n.x},${n.y})`}
              style={{ cursor: 'pointer', opacity: faded ? 0.22 : 1, transition: 'opacity 0.2s' }}
              onMouseEnter={() => setHover(n.id)}
              onMouseLeave={() => {
                setHover(null)
                hide()
              }}
              onMouseMove={(e) =>
                show(
                  <div>
                    <div className="tt-title mono" style={{ fontSize: 11 }}>
                      {n.id}
                    </div>
                    <div className="tt-row">
                      <span>depended on by</span>
                      <span className="v">{n.fanIn}</span>
                    </div>
                    <div className="tt-row">
                      <span>depends on</span>
                      <span className="v">{n.fanOut}</span>
                    </div>
                    <div className="tt-row">
                      <span>kind</span>
                      <span className="v">{n.kind}</span>
                    </div>
                  </div>,
                  e
                )
              }
            >
              {isRust ? (
                <rect
                  x={-r}
                  y={-r}
                  width={r * 2}
                  height={r * 2}
                  rx={3}
                  transform="rotate(45)"
                  fill={c.soft}
                  stroke={c.mark}
                  strokeWidth={1.4}
                />
              ) : (
                <circle r={r} fill={c.soft} stroke={c.mark} strokeWidth={1.4} />
              )}
              {(r > 9 || hover === n.id) && (
                <text
                  y={r + 11}
                  textAnchor="middle"
                  className="mono"
                  style={{ fill: hover === n.id ? 'var(--ink)' : 'var(--ink-3)', fontSize: 9.5, pointerEvents: 'none' }}
                >
                  {n.short.length > 14 ? `${n.short.slice(0, 13)}…` : n.short}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
