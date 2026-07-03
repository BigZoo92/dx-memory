import { github, githubOk } from '../data'
import { VARIANT_COLOR } from '../lib/theme'
import { formatDuration, shortTime } from '../lib/format'
import { Reveal, StatTile } from './ui'

const BUCKET_META: { key: string; label: string; color: string }[] = [
  { key: 'flow', label: 'Flow', color: VARIANT_COLOR.flow.mark },
  { key: 'friction', label: 'Friction', color: VARIANT_COLOR.friction.mark },
  { key: 'overfit', label: 'Overfit', color: VARIANT_COLOR.overfit.mark },
  { key: 'metricsDashboard', label: 'Metrics/Dashboard', color: '#5b9bd5' },
  { key: 'config', label: 'Config', color: '#e8b339' },
  { key: 'other', label: 'Other', color: 'rgba(255,255,255,0.3)' }
]

/**
 * Pull-request shape as a proxy for the cost of review — explicitly repo-level, mixing every
 * chantier. NOT a controlled per-variant scenario, and separate from the future manual/AI
 * change-cost benchmarks. Rendered only when merged PRs were actually sampled.
 */
export function PullRequests() {
  const pr = githubOk && github ? github.pullRequests : null
  if (!pr || pr.detailed === 0) {
    return (
      <p className="chart-note">
        No merged pull-request data available in this build (no token, or the repo has no merged PRs in the sampled window).
        This section stays empty rather than inventing a number.
      </p>
    )
  }

  const buckets = pr.buckets ?? {}
  const bucketTotal = Object.values(buckets).reduce((a, b) => a + (b || 0), 0)

  return (
    <>
      <Reveal className="card">
        <div className="stat-grid">
          <StatTile label="Changed files (avg)" value={pr.avgChangedFiles ?? '—'} sub={`median ${pr.medianChangedFiles ?? '—'}`} />
          <StatTile label="Additions (avg)" value={pr.avgAdditions != null ? `+${pr.avgAdditions}` : '—'} sub={pr.avgDeletions != null ? `−${pr.avgDeletions} deletions` : undefined} />
          <StatTile label="Time to merge (avg)" value={formatDuration(pr.avgTimeToMergeMs)} sub={`median ${formatDuration(pr.medianTimeToMergeMs)}`} />
          <StatTile label="Reviews (avg)" value={pr.avgReviewCount ?? '—'} sub={pr.avgReviewComments != null ? `${pr.avgReviewComments} comments` : undefined} />
          <StatTile label="Merged (sampled)" value={pr.detailed} sub={`of ${pr.mergedCount} merged · ${pr.count} closed`} />
        </div>
        <p className="chart-note">
          Proxy for the cost of review, <b>not a controlled scenario</b>. These are repo-level and mix every chantier — kept
          separate from the future human/AI change-cost benchmarks.
        </p>
      </Reveal>

      {bucketTotal > 0 && (
        <Reveal className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>Where merged PRs touched files</div>
          <div className="stack-bar">
            {BUCKET_META.filter((b) => (buckets[b.key] || 0) > 0).map((b) => (
              <div
                key={b.key}
                className="stack-seg"
                style={{ width: `${((buckets[b.key] || 0) / bucketTotal) * 100}%`, background: b.color }}
                title={`${b.label}: ${buckets[b.key]} files`}
              />
            ))}
          </div>
          <div className="legend" style={{ marginTop: 10 }}>
            {BUCKET_META.filter((b) => (buckets[b.key] || 0) > 0).map((b) => (
              <span className="legend-item" key={b.key}>
                <span className="legend-swatch" style={{ background: b.color }} />
                {b.label} · {buckets[b.key]}
              </span>
            ))}
          </div>
          <p className="chart-note">File-path attribution across the sampled PRs (best-effort, from PR file lists).</p>
        </Reveal>
      )}

      <Reveal className="card">
        <div className="card-title" style={{ marginBottom: 12 }}>Recent merged PRs</div>
        <div className="table-wrap">
          <table className="metrics">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>PR</th>
                <th>Files</th>
                <th>+/−</th>
                <th>Reviews</th>
                <th>Merged in</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {pr.list.slice(0, 12).map((p) => (
                <tr key={p.number}>
                  <td style={{ textAlign: 'left', maxWidth: 320, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <a href={p.htmlUrl} target="_blank" rel="noopener noreferrer" className="mono tiny">#{p.number}</a> {p.title}
                  </td>
                  <td className="cell-val">{p.changedFiles ?? '—'}</td>
                  <td className="cell-val mono tiny">{p.additions != null ? `+${p.additions}` : '—'} / {p.deletions != null ? `−${p.deletions}` : '—'}</td>
                  <td className="cell-val">{p.reviewCount ?? '—'}</td>
                  <td className="cell-val">{formatDuration(p.timeToMergeMs)}</td>
                  <td className="cell-val tiny muted">{p.mergedAt ? shortTime(p.mergedAt) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>
    </>
  )
}
