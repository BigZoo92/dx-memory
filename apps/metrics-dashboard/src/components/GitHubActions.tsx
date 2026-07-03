import { github, githubSource, githubOk, githubConfidence } from '../data'
import { STATUS } from '../lib/theme'
import { formatDuration, formatBytes } from '../lib/format'
import { Reveal, StatTile, StatusBadge } from './ui'
import { RunTimeline } from './charts/RunTimeline'
import { JobBars } from './charts/JobBars'
import { JobHeatmap } from './charts/JobHeatmap'

const CONF_COLOR = { high: STATUS.good, medium: STATUS.warning, low: STATUS.serious, none: STATUS.muted } as const

/** Shown when the GitHub collector had no token / no repo / an API error — honest, no fakes. */
function GitHubUnavailable() {
  return (
    <Reveal className="card">
      <div className="between" style={{ marginBottom: 10 }}>
        <span className="card-title">GitHub Actions</span>
        <StatusBadge color={STATUS.muted}>No signal</StatusBadge>
      </div>
      <p className="sec-lede" style={{ margin: 0 }}>
        The delivery-pipeline metrics are collected server-side from the GitHub API — never in the browser, never with a token
        shipped to this static site. This build was produced without a token, so the section is empty rather than faked.
      </p>
      <p className="chart-note">
        Reason: {githubSource?.reason ?? 'GitHub API not queried.'} · To populate it, run the collector with a token
        (see the README → GitHub API integration) or let the <code className="mono">metrics</code> workflow generate the build in CI.
      </p>
    </Reveal>
  )
}

/**
 * Ship / GitHub Actions section: the real cost of the shared delivery pipeline. Repo-level —
 * the three variants share one monorepo CI run, so these numbers describe the chain, not a
 * single variant (called out explicitly).
 */
export function GitHubActions() {
  if (!githubOk || !github) return <GitHubUnavailable />

  const rs = github.runsSummary
  const flaky = github.flakyProxy
  const arts = github.artifacts
  const deploy = github.deploy
  const conf = githubConfidence()
  const confColor = CONF_COLOR[conf.level]

  return (
    <>
      <Reveal className="card">
        <div className="between wrap" style={{ marginBottom: 16, gap: 12 }}>
          <div className="row" style={{ gap: 10 }}>
            <span className="card-title">GitHub Actions</span>
            <span className="tiny muted mono">{githubSource?.repository}</span>
          </div>
          <StatusBadge color={confColor} title={conf.detail}>
            {conf.label}
          </StatusBadge>
        </div>

        <div className="stat-grid">
          <StatTile label="CI wall time (avg)" value={formatDuration(rs?.wallTime.avgMs)} sub={`p95 ${formatDuration(rs?.wallTime.p95Ms)} · latest ${formatDuration(rs?.wallTime.latestMs)}`} />
          <StatTile
            label="Success rate"
            value={rs?.successRate != null ? `${rs.successRate}%` : '—'}
            sub={`${rs?.successCount ?? 0}✓ · ${rs?.failureCount ?? 0}✕ of ${rs?.completedCount ?? 0}`}
            accent={rs?.successRate != null && rs.successRate >= 90 ? STATUS.good : STATUS.warning}
          />
          <StatTile
            label="Instability proxy"
            value={flaky.rate != null ? `${Math.round(flaky.rate * 100)}%` : '—'}
            sub={`${flaky.unstableJobsCount} unstable job${flaky.unstableJobsCount === 1 ? '' : 's'}`}
            accent={flaky.unstableJobsCount ? STATUS.serious : STATUS.good}
          />
          <StatTile label="Artifacts" value={formatBytes(arts.totalSizeBytes)} sub={`${arts.count} artifact${arts.count === 1 ? '' : 's'}`} />
          <StatTile label="Queue time (avg)" value={formatDuration(rs?.queueTime.avgMs)} sub="runner pickup latency" />
          <StatTile
            label="Deploy"
            value={deploy.avgDurationMs != null ? formatDuration(deploy.avgDurationMs) : deploy.latestStatus ?? '—'}
            sub={`source: ${deploy.source.replace('_', ' ')}`}
          />
        </div>
        <p className="chart-note">
          Repo-level: the three variants share one monorepo pipeline, so these describe the shared delivery chain — not a single
          variant. Sampled from the last {githubSource?.runLimit} runs
          {rs?.truncated ? ' (list truncated)' : ''}. Signal confidence reflects how much of the pipeline was observable.
        </p>
      </Reveal>

      <div className="grid cols-2">
        <Reveal className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>Recent runs</div>
          <RunTimeline />
          <p className="chart-note">Bar height = wall time, color = conclusion (green ✓ / red ✕ / amber cancelled). Click a bar to open the run.</p>
        </Reveal>
        <Reveal className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>Slowest jobs (avg duration)</div>
          <JobBars />
          <p className="chart-note">
            {github.jobs.slowestJob ? <>Slowest: <b>{github.jobs.slowestJob.name}</b> at {formatDuration(github.jobs.slowestJob.durationMs)}. </> : null}
            Orange bars mark unstable jobs.
          </p>
        </Reveal>
      </div>

      <Reveal className="card">
        <div className="between" style={{ marginBottom: 12 }}>
          <span className="card-title">Job stability — success / failure per run</span>
          <span className="tiny muted">{flaky.method}</span>
        </div>
        <JobHeatmap />
      </Reveal>
    </>
  )
}
