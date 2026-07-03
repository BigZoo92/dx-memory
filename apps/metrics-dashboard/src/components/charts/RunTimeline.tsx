import { github } from '../../data'
import { conclusionColor } from '../../lib/theme'
import { formatDuration, shortTime } from '../../lib/format'
import { useWidth } from './base'
import { useTip } from '../ui'

/**
 * The last N workflow runs as a timeline (oldest → newest). Each bar's height encodes wall
 * time; its color the conclusion. A dashed baseline marks the average so slow runs pop.
 */
export function RunTimeline() {
  const [ref, width] = useWidth<HTMLDivElement>()
  const { show, hide } = useTip()
  const runs = (github?.runs ?? []).slice().reverse() // chronological
  if (!runs.length) return <p className="chart-note">No workflow runs returned.</p>

  const padL = 8
  const padR = 8
  const top = 12
  const barsH = 132
  const labelH = 22
  const height = top + barsH + labelH
  const plotW = Math.max(120, width - padL - padR)
  const gap = 4
  const bw = Math.max(3, plotW / runs.length - gap)
  const walls = runs.map((r) => r.wallTimeMs ?? 0)
  const maxWall = Math.max(...walls, 1)
  const avgWall = walls.reduce((a, b) => a + b, 0) / (walls.filter(Boolean).length || 1)
  const avgY = top + barsH - (avgWall / maxWall) * barsH

  return (
    <div ref={ref}>
      <svg width="100%" height={height} viewBox={`0 0 ${Math.max(width, 320)} ${height}`} role="img" aria-label="Recent workflow runs timeline">
        {avgWall > 0 && (
          <>
            <line className="grid-line" x1={padL} x2={padL + plotW} y1={avgY} y2={avgY} strokeDasharray="3 3" />
            <text className="axis-label" x={padL + plotW} y={avgY - 5} textAnchor="end">
              avg {formatDuration(avgWall)}
            </text>
          </>
        )}
        {runs.map((r, i) => {
          const h = r.wallTimeMs ? Math.max(3, (r.wallTimeMs / maxWall) * barsH) : 4
          const x = padL + i * (bw + gap)
          const y = top + barsH - h
          const color = conclusionColor(r.conclusion)
          return (
            <g
              key={r.id}
              style={{ cursor: 'pointer' }}
              onMouseMove={(e) =>
                show(
                  <div>
                    <div className="tt-title">
                      {r.workflow ?? r.name} · #{r.runNumber}
                    </div>
                    <div className="tt-row"><span>conclusion</span><span className="v">{r.conclusion ?? r.status}</span></div>
                    <div className="tt-row"><span>wall time</span><span className="v">{formatDuration(r.wallTimeMs)}</span></div>
                    {r.queueTimeMs != null && <div className="tt-row"><span>queued</span><span className="v">{formatDuration(r.queueTimeMs)}</span></div>}
                    <div className="tt-row"><span>when</span><span className="v">{shortTime(r.createdAt)}</span></div>
                  </div>,
                  e
                )
              }
              onMouseLeave={hide}
              onClick={() => window.open(r.htmlUrl, '_blank', 'noopener')}
            >
              <rect x={x} y={y} width={bw} height={h} rx={2} fill={color} opacity={0.85} />
            </g>
          )
        })}
        {/* first + last time labels */}
        <text className="axis-label" x={padL} y={height - 6} textAnchor="start">{shortTime(runs[0].createdAt)}</text>
        <text className="axis-label" x={padL + plotW} y={height - 6} textAnchor="end">{shortTime(runs[runs.length - 1].createdAt)}</text>
      </svg>
    </div>
  )
}
