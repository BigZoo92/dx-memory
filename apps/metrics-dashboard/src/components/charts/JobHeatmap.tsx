import { github } from '../../data'
import { conclusionColor } from '../../lib/theme'
import { formatDuration } from '../../lib/format'
import { useTip } from '../ui'

/**
 * Job × run success/fail heatmap. Rows = job names, columns = sampled runs (newest left).
 * Each cell's color is that job's conclusion in that run — an at-a-glance instability map.
 */
export function JobHeatmap() {
  const { show, hide } = useTip()
  const heatmap = github?.jobs?.heatmap ?? []
  const jobNames = (github?.jobs?.byName ?? []).map((j) => j.name)
  if (!heatmap.length || !jobNames.length) return <p className="chart-note">No per-run job data returned.</p>

  const runs = heatmap // already newest-first, capped by the collector
  const cell = 20
  const gap = 3
  const labelW = 150

  const conclusionFor = (runIdx: number, name: string) =>
    runs[runIdx].jobs.find((j) => j.name === name)

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: labelW + runs.length * (cell + gap) }}>
        {jobNames.map((name) => (
          <div key={name} className="row" style={{ gap, marginBottom: gap, alignItems: 'center' }}>
            <span className="tiny mono" style={{ width: labelW, color: 'var(--ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={name}>
              {name}
            </span>
            {runs.map((r, i) => {
              const job = conclusionFor(i, name)
              const present = !!job
              return (
                <div
                  key={r.runNumber}
                  style={{
                    width: cell,
                    height: cell,
                    borderRadius: 4,
                    background: present ? conclusionColor(job!.conclusion) : 'var(--surface-2)',
                    border: present ? 'none' : '1px dashed var(--hair)',
                    opacity: present ? 0.9 : 0.5,
                    cursor: 'default'
                  }}
                  onMouseMove={(e) =>
                    show(
                      <div>
                        <div className="tt-title">{name} · run #{r.runNumber}</div>
                        <div className="tt-row"><span>conclusion</span><span className="v">{job?.conclusion ?? 'not present'}</span></div>
                        {job?.durationMs != null && <div className="tt-row"><span>duration</span><span className="v">{formatDuration(job.durationMs)}</span></div>}
                      </div>,
                      e
                    )
                  }
                  onMouseLeave={hide}
                />
              )
            })}
          </div>
        ))}
        <div className="row" style={{ gap, marginTop: 6 }}>
          <span className="tiny muted" style={{ width: labelW }}>← newest run · older →</span>
        </div>
      </div>
    </div>
  )
}
