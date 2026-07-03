import { github } from '../../data'
import { STATUS } from '../../lib/theme'
import { formatDuration } from '../../lib/format'
import { useTip } from '../ui'

/**
 * Average duration per job (the most expensive job first). Bar length = avg duration; a red
 * cap flags an unstable job (both passed and failed across the sampled runs).
 */
export function JobBars({ limit = 10 }: { limit?: number }) {
  const { show, hide } = useTip()
  const jobs = (github?.jobs?.byName ?? []).filter((j) => j.avgDurationMs != null).slice(0, limit)
  if (!jobs.length) return <p className="chart-note">No job timings returned for the sampled runs.</p>
  const max = Math.max(...jobs.map((j) => j.avgDurationMs ?? 0), 1)

  return (
    <div>
      {jobs.map((j) => {
        const pct = ((j.avgDurationMs ?? 0) / max) * 100
        const unstable = (j.failureCount ?? 0) > 0 && (j.successRate ?? 0) > 0
        return (
          <div key={j.name} className="row" style={{ marginBottom: 8, gap: 12 }}>
            <span className="tiny mono" style={{ width: 150, color: 'var(--ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={j.name}>
              {j.name}
            </span>
            <div
              style={{ flex: 1, height: 20, position: 'relative', cursor: 'default' }}
              onMouseMove={(e) =>
                show(
                  <div>
                    <div className="tt-title">{j.name}</div>
                    <div className="tt-row"><span>avg</span><span className="v">{formatDuration(j.avgDurationMs)}</span></div>
                    <div className="tt-row"><span>p95</span><span className="v">{formatDuration(j.p95DurationMs)}</span></div>
                    <div className="tt-row"><span>runs</span><span className="v">{j.runsCount}</span></div>
                    <div className="tt-row"><span>success</span><span className="v">{j.successRate ?? '—'}%</span></div>
                  </div>,
                  e
                )
              }
              onMouseLeave={hide}
            >
              <div style={{ position: 'absolute', inset: 0, borderRadius: 6, background: 'var(--surface-2)', border: '1px solid var(--hair)' }} />
              <div
                style={{
                  position: 'absolute',
                  top: 3,
                  bottom: 3,
                  left: 3,
                  width: `calc(${Math.max(2, pct)}% - 6px)`,
                  minWidth: 4,
                  borderRadius: 4,
                  background: unstable ? STATUS.serious : 'var(--flow)',
                  transition: 'width 0.8s cubic-bezier(0.2,0.7,0.2,1)'
                }}
              />
              <span className="mono" style={{ position: 'absolute', right: 9, top: 2, fontSize: 12, color: 'var(--ink)', lineHeight: '16px' }}>
                {formatDuration(j.avgDurationMs)}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
