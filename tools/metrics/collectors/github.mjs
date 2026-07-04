/**
 * GitHub collector — enriches the delivery (Ship) and change axes with the *real* cost of
 * the GitHub Actions pipeline: CI wall time, success rate, an honest job-level instability
 * proxy, artifacts, deployments, and pull-request shape.
 *
 * Everything here is REPO-LEVEL: the three variants share one monorepo pipeline, so these
 * numbers describe the shared delivery chain, not a single variant. They are surfaced as
 * repo-level (they tie across variants when fed to the scorer) and documented as such.
 *
 * Failure policy (identical to the rest of the pipeline):
 *   • No token / no repo         → every metric `unavailable` with a reason, `status:'unavailable'`.
 *   • Rate-limited / API error   → partial data kept, missing pieces `unavailable`, never throws.
 *   • One failing section (e.g. artifacts) never takes down the others.
 *
 * The token is read via lib/env.mjs and only ever used inside lib/github-client.mjs. It is
 * never returned, logged, or written to any results file.
 */
import { ok, unavailable, round, bytesToKb } from '../lib/metric.mjs'
import { createGithubClient } from '../lib/github-client.mjs'

/* --------------------------------------------------------------- stats utils */
function nums(arr) {
  return arr.filter((v) => typeof v === 'number' && Number.isFinite(v))
}
function avg(arr) {
  const n = nums(arr)
  return n.length ? n.reduce((a, b) => a + b, 0) / n.length : null
}
function median(arr) {
  const n = nums(arr).sort((a, b) => a - b)
  if (!n.length) return null
  const mid = Math.floor(n.length / 2)
  return n.length % 2 ? n[mid] : (n[mid - 1] + n[mid]) / 2
}
function percentile(arr, p) {
  const n = nums(arr).sort((a, b) => a - b)
  if (!n.length) return null
  const idx = Math.min(n.length - 1, Math.ceil((p / 100) * n.length) - 1)
  return n[Math.max(0, idx)]
}
function msBetween(later, earlier) {
  if (!later || !earlier) return null
  const d = new Date(later).getTime() - new Date(earlier).getTime()
  return Number.isFinite(d) && d >= 0 ? d : null
}

/* --------------------------------------------------------- workflow detection */
const CI_HINTS = [/(^|[-_/])ci([-_.]|$)/i, /flow-ci/i, /test/i, /build/i]
const DEPLOY_HINTS = [/deploy/i, /release/i, /publish/i]

function classifyWorkflow(nameOrPath = '') {
  const s = String(nameOrPath).toLowerCase()
  if (DEPLOY_HINTS.some((r) => r.test(s))) return 'deploy'
  if (/metrics/.test(s)) return 'metrics'
  if (CI_HINTS.some((r) => r.test(s))) return 'ci'
  return 'other'
}

/* ------------------------------------------------------------ PR file buckets */
function bucketForPath(path, variantRoots) {
  const p = path.toLowerCase()
  if (p.includes('metrics-dashboard') || p.startsWith('tools/metrics')) return 'metricsDashboard'
  for (const [variant, roots] of Object.entries(variantRoots)) {
    if (roots.some((r) => p.startsWith(r.toLowerCase()))) return variant
  }
  if (/\.(json|ya?ml|toml|config\.|rc$)/.test(p) || p.startsWith('.github/')) return 'config'
  return 'other'
}

/**
 * @param {object} config  resolved GitHub config (see lib/env.mjs)
 * @param {object} deps    { variantRoots: Record<variantId, string[]>, now: isoString }
 */
export async function collectGithub(config, { variantRoots = {}, now } = {}) {
  const collectedAt = now
  const unavail = (reason) => makeResult('unavailable', reason)

  function makeResult(status, reason) {
    const keys = [
      'ship.ci.wallTime.avg',
      'ship.ci.wallTime.p95',
      'ship.ci.successRate.lastN',
      'ship.ci.flakyProxy.rate',
      'ship.ci.artifacts.totalSize',
      'ship.deploy.avgDuration',
      'change.pr.avgChangedFiles',
      'change.pr.avgAdditions',
      'change.pr.avgDeletions',
      'change.pr.avgTimeToMerge',
      'change.pr.avgReviewCount'
    ]
    const metrics = {}
    for (const k of keys) metrics[k] = unavailable(reason)
    return {
      source: {
        status,
        repository: config.repository ?? null,
        tokenSource: config.tokenSource ?? null,
        runLimit: config.runLimit,
        prLimit: config.prLimit,
        workflows: config.workflows,
        collectedAt,
        reason: status === 'ok' ? undefined : reason
      },
      metrics,
      raw: emptyRaw()
    }
  }

  if (!config.token) return unavail('No GitHub token found (set METRICS_GITHUB_TOKEN / GITHUB_TOKEN / GH_TOKEN).')
  if (!config.repository)
    return unavail('No repository resolved (set METRICS_GITHUB_REPOSITORY=owner/repo or add a git origin remote).')

  const client = createGithubClient({ token: config.token, apiBase: config.apiBase })
  const repo = config.repository
  const raw = emptyRaw()
  const notes = []

  /* ------------------------------------------------------- A/B/C. runs + jobs */
  let runs = []
  const runsRes = await client.paginate(`/repos/${repo}/actions/runs`, {
    listKey: 'workflow_runs',
    limit: config.runLimit,
    params: { per_page: 100 }
  })
  if (!runsRes.ok) {
    // Hard failure talking to Actions API → whole collector is unavailable, but honest.
    return unavail(
      runsRes.rateLimited
        ? 'GitHub API rate limit reached while listing workflow runs.'
        : `Could not list workflow runs: ${runsRes.error}`
    )
  }

  let allRuns = runsRes.items
  // Optional focus on configured workflow files (metrics.yml, ci.yml, deploy.yml, …).
  if (config.workflows.length) {
    const wanted = new Set(config.workflows.map((w) => w.toLowerCase()))
    const filtered = allRuns.filter((r) => {
      const file = (r.path || '').split('/').pop()?.toLowerCase()
      return file && wanted.has(file)
    })
    if (filtered.length) allRuns = filtered
    else notes.push('None of METRICS_GITHUB_WORKFLOWS matched recent runs; using all workflows.')
  }

  runs = allRuns.map((r) => {
    const wall = msBetween(r.updated_at, r.run_started_at) ?? msBetween(r.updated_at, r.created_at)
    const queue = msBetween(r.run_started_at, r.created_at)
    return {
      id: r.id,
      name: r.name,
      workflow: (r.path || '').split('/').pop() || null,
      kind: classifyWorkflow(r.path || r.name),
      event: r.event,
      status: r.status,
      conclusion: r.conclusion,
      runNumber: r.run_number,
      runAttempt: r.run_attempt ?? null,
      branch: r.head_branch,
      createdAt: r.created_at,
      runStartedAt: r.run_started_at,
      updatedAt: r.updated_at,
      wallTimeMs: wall,
      queueTimeMs: queue,
      htmlUrl: r.html_url
    }
  })
  raw.runs = runs

  const completed = runs.filter((r) => r.status === 'completed')
  const successCount = completed.filter((r) => r.conclusion === 'success').length
  const failureCount = completed.filter((r) => r.conclusion === 'failure').length
  const cancelledCount = completed.filter((r) => r.conclusion === 'cancelled').length
  const skippedCount = completed.filter((r) => r.conclusion === 'skipped').length
  const wallTimes = completed.map((r) => r.wallTimeMs)
  const queueTimes = completed.map((r) => r.queueTimeMs)
  const latest = runs[0] ?? null

  raw.runsSummary = {
    count: runs.length,
    completedCount: completed.length,
    successCount,
    failureCount,
    cancelledCount,
    skippedCount,
    successRate: completed.length ? round((successCount / completed.length) * 100, 1) : null,
    wallTime: {
      latestMs: latest?.wallTimeMs ?? null,
      avgMs: round(avg(wallTimes)),
      medianMs: round(median(wallTimes)),
      p95Ms: round(percentile(wallTimes, 95))
    },
    queueTime: { avgMs: round(avg(queueTimes)) },
    latestRun: latest
      ? { status: latest.status, conclusion: latest.conclusion, htmlUrl: latest.htmlUrl, runNumber: latest.runNumber }
      : null,
    truncated: runsRes.truncated
  }

  /* jobs — bounded number of run detail calls to keep the API budget sane */
  const JOB_RUN_CAP = Math.min(runs.length, 15)
  const jobRecords = [] // { runId, runNumber, name, durationMs, conclusion }
  let jobsQueried = 0
  let jobsError = null
  for (const r of runs.slice(0, JOB_RUN_CAP)) {
    const jr = await client.request(`/repos/${repo}/actions/runs/${r.id}/jobs`, { params: { per_page: 100 } })
    if (!jr.ok) {
      jobsError = jr.rateLimited ? 'rate limit reached while fetching jobs' : jr.error
      if (jr.rateLimited) break
      continue
    }
    jobsQueried++
    for (const j of jr.data?.jobs ?? []) {
      jobRecords.push({
        runId: r.id,
        runNumber: r.runNumber,
        name: j.name,
        conclusion: j.conclusion,
        startedAt: j.started_at,
        completedAt: j.completed_at,
        durationMs: msBetween(j.completed_at, j.started_at)
      })
    }
  }

  const byNameMap = new Map()
  for (const j of jobRecords) {
    if (!byNameMap.has(j.name)) byNameMap.set(j.name, [])
    byNameMap.get(j.name).push(j)
  }
  const jobsByName = [...byNameMap.entries()].map(([name, recs]) => {
    const durations = recs.map((r) => r.durationMs)
    const done = recs.filter((r) => r.conclusion && r.conclusion !== 'skipped')
    const succ = done.filter((r) => r.conclusion === 'success').length
    const fail = done.filter((r) => r.conclusion === 'failure').length
    return {
      name,
      runsCount: recs.length,
      avgDurationMs: round(avg(durations)),
      medianDurationMs: round(median(durations)),
      p95DurationMs: round(percentile(durations, 95)),
      maxDurationMs: round(Math.max(...nums(durations), 0)) || null,
      successRate: done.length ? round((succ / done.length) * 100, 1) : null,
      failureCount: fail,
      failureRate: done.length ? round((fail / done.length) * 100, 1) : null,
      latestConclusion: recs[0]?.conclusion ?? null
    }
  })
  jobsByName.sort((a, b) => (b.avgDurationMs ?? 0) - (a.avgDurationMs ?? 0))
  const slowest = jobsByName[0] ?? null

  // Heatmap matrix: per run × job conclusion (only the runs we fetched jobs for).
  const heatmapRuns = [...new Set(jobRecords.map((j) => j.runNumber))].sort((a, b) => b - a).slice(0, JOB_RUN_CAP)
  raw.jobs = {
    queriedRuns: jobsQueried,
    count: jobRecords.length,
    // Flat per-job records (with runId) so downstream per-variant collectors can join jobs→runs
    // and attribute real cached feedback time to a specific variant workflow's quality job(s).
    records: jobRecords,
    byName: jobsByName,
    slowestJob: slowest ? { name: slowest.name, durationMs: slowest.avgDurationMs } : null,
    avgDurationMs: round(avg(jobRecords.map((j) => j.durationMs))),
    maxDurationMs: round(Math.max(...nums(jobRecords.map((j) => j.durationMs)), 0)) || null,
    heatmap: heatmapRuns.map((runNumber) => ({
      runNumber,
      jobs: jobRecords
        .filter((j) => j.runNumber === runNumber)
        .map((j) => ({ name: j.name, conclusion: j.conclusion, durationMs: j.durationMs }))
    })),
    note: jobsError ? `partial: ${jobsError}` : undefined
  }

  /* C. flaky proxy — a job is "unstable" if, over the sampled runs, it both passed AND failed */
  const unstableJobs = jobsByName
    .filter((j) => {
      const recs = byNameMap.get(j.name) ?? []
      const hasSucc = recs.some((r) => r.conclusion === 'success')
      const hasFail = recs.some((r) => r.conclusion === 'failure')
      return hasSucc && hasFail
    })
    .map((j) => ({ name: j.name, failureRate: j.failureRate, runsCount: j.runsCount }))
  const flakyRate = jobsByName.length ? round(unstableJobs.length / jobsByName.length, 3) : null
  raw.flakyProxy = {
    unstableJobsCount: unstableJobs.length,
    unstableJobs,
    rate: flakyRate,
    method: 'job-level instability proxy: a job that both passed and failed across the sampled runs. NOT a test-level flaky rate.'
  }

  /* D. artifacts */
  const artRes = await client.paginate(`/repos/${repo}/actions/artifacts`, {
    listKey: 'artifacts',
    limit: 100,
    params: { per_page: 100 }
  })
  if (artRes.ok) {
    const arts = artRes.items.filter((a) => !a.expired)
    const totalBytes = arts.reduce((s, a) => s + (a.size_in_bytes || 0), 0)
    raw.artifacts = {
      count: arts.length,
      totalSizeBytes: totalBytes,
      avgSizeBytes: arts.length ? Math.round(totalBytes / arts.length) : 0,
      metricsArtifactsCount: arts.filter((a) => /metric/i.test(a.name)).length,
      dashboardArtifactsCount: arts.filter((a) => /dashboard/i.test(a.name)).length,
      latest: arts
        .slice(0, 10)
        .map((a) => ({ name: a.name, sizeBytes: a.size_in_bytes, createdAt: a.created_at }))
    }
  } else {
    raw.artifacts = { ...emptyRaw().artifacts, note: artRes.rateLimited ? 'rate limit' : artRes.error }
  }

  /* E. pull requests */
  const prRes = await client.paginate(`/repos/${repo}/pulls`, {
    listKey: null,
    limit: config.prLimit,
    params: { state: 'closed', sort: 'updated', direction: 'desc', per_page: 100 }
  })
  if (prRes.ok) {
    const merged = prRes.items.filter((p) => p.merged_at)
    // Detail (additions/deletions/changed_files) needs a per-PR GET. Bound the calls.
    const DETAIL_CAP = Math.min(merged.length, config.prLimit)
    const FILES_CAP = Math.min(merged.length, 10)
    const prList = []
    const buckets = { flow: 0, friction: 0, overfit: 0, metricsDashboard: 0, config: 0, other: 0 }
    for (let i = 0; i < DETAIL_CAP; i++) {
      const p = merged[i]
      const d = await client.request(`/repos/${repo}/pulls/${p.number}`)
      if (d.rateLimited) break
      const detail = d.ok ? d.data : null
      let reviewCount = null
      const rv = await client.request(`/repos/${repo}/pulls/${p.number}/reviews`, { params: { per_page: 100 } })
      if (rv.ok && Array.isArray(rv.data)) reviewCount = rv.data.length
      else if (rv.rateLimited) break

      let touched = null
      if (i < FILES_CAP) {
        const fr = await client.paginate(`/repos/${repo}/pulls/${p.number}/files`, { listKey: null, limit: 300, params: { per_page: 100 } })
        if (fr.ok) {
          touched = { flow: 0, friction: 0, overfit: 0, metricsDashboard: 0, config: 0, other: 0 }
          for (const f of fr.items) {
            const b = bucketForPath(f.filename, variantRoots)
            touched[b]++
            buckets[b]++
          }
        }
      }
      prList.push({
        number: p.number,
        title: p.title,
        htmlUrl: p.html_url,
        mergedAt: p.merged_at,
        changedFiles: detail?.changed_files ?? null,
        additions: detail?.additions ?? null,
        deletions: detail?.deletions ?? null,
        reviewCount,
        reviewComments: detail?.review_comments ?? null,
        timeToMergeMs: msBetween(p.merged_at, p.created_at),
        touched
      })
    }
    raw.pullRequests = {
      count: prRes.items.length,
      mergedCount: merged.length,
      detailed: prList.length,
      list: prList,
      buckets,
      avgChangedFiles: round(avg(prList.map((p) => p.changedFiles)), 1),
      medianChangedFiles: round(median(prList.map((p) => p.changedFiles)), 1),
      avgAdditions: round(avg(prList.map((p) => p.additions))),
      avgDeletions: round(avg(prList.map((p) => p.deletions))),
      avgReviewCount: round(avg(prList.map((p) => p.reviewCount)), 1),
      avgReviewComments: round(avg(prList.map((p) => p.reviewComments)), 1),
      avgTimeToMergeMs: round(avg(prList.map((p) => p.timeToMergeMs))),
      medianTimeToMergeMs: round(median(prList.map((p) => p.timeToMergeMs)))
    }
  } else {
    raw.pullRequests = { ...emptyRaw().pullRequests, note: prRes.rateLimited ? 'rate limit' : prRes.error }
  }

  /* F. deployments — prefer the Deployments API, else derive from deploy-named jobs */
  raw.deploy = await collectDeploy(client, repo, jobRecords)

  /* ---------------------------------------------------- normalized metric map */
  const rs = raw.runsSummary
  const metrics = {
    'ship.ci.wallTime.avg': numOrUnavail(rs.wallTime.avgMs, 'No completed runs to time.'),
    'ship.ci.wallTime.p95': numOrUnavail(rs.wallTime.p95Ms, 'No completed runs to time.'),
    'ship.ci.successRate.lastN': numOrUnavail(rs.successRate, 'No completed runs.'),
    'ship.ci.flakyProxy.rate': numOrUnavail(flakyRate, 'No jobs sampled.'),
    'ship.ci.artifacts.totalSize': numOrUnavail(
      raw.artifacts.count ? bytesToKb(raw.artifacts.totalSizeBytes) : null,
      'No artifacts found.'
    ),
    'ship.deploy.avgDuration': numOrUnavail(raw.deploy.avgDurationMs, raw.deploy.reason ?? 'No deployment signal.'),
    'change.pr.avgChangedFiles': numOrUnavail(raw.pullRequests.avgChangedFiles, 'No merged PRs sampled.'),
    'change.pr.avgAdditions': numOrUnavail(raw.pullRequests.avgAdditions, 'No merged PRs sampled.'),
    'change.pr.avgDeletions': numOrUnavail(raw.pullRequests.avgDeletions, 'No merged PRs sampled.'),
    'change.pr.avgTimeToMerge': numOrUnavail(raw.pullRequests.avgTimeToMergeMs, 'No merged PRs sampled.'),
    'change.pr.avgReviewCount': numOrUnavail(raw.pullRequests.avgReviewCount, 'No merged PRs sampled.')
  }

  const stats = client.stats()
  return {
    source: {
      status: 'ok',
      repository: repo,
      tokenSource: config.tokenSource,
      runLimit: config.runLimit,
      prLimit: config.prLimit,
      workflows: config.workflows,
      requestCount: stats.requestCount,
      rateLimitRemaining: stats.lastRateLimit.remaining,
      notes: notes.length ? notes : undefined,
      collectedAt
    },
    metrics,
    raw
  }
}

/* ---------------------------------------------------------------- deployments */
async function collectDeploy(client, repo, jobRecords) {
  const depRes = await client.paginate(`/repos/${repo}/deployments`, { listKey: null, limit: 20, params: { per_page: 100 } })
  if (depRes.ok && depRes.items.length) {
    const deployments = []
    for (const d of depRes.items.slice(0, 10)) {
      const sr = await client.request(`/repos/${repo}/deployments/${d.id}/statuses`, { params: { per_page: 100 } })
      const statuses = sr.ok && Array.isArray(sr.data) ? sr.data : []
      const finalState = statuses[0]?.state ?? null
      const durationMs = statuses.length
        ? msBetween(statuses[0]?.created_at, d.created_at)
        : null
      deployments.push({ id: d.id, environment: d.environment, ref: d.ref, createdAt: d.created_at, state: finalState, durationMs })
    }
    const durations = deployments.map((d) => d.durationMs)
    const done = deployments.filter((d) => d.state)
    const succ = done.filter((d) => d.state === 'success').length
    return {
      source: 'deployments_api',
      latestStatus: deployments[0]?.state ?? null,
      latestDurationMs: deployments[0]?.durationMs ?? null,
      avgDurationMs: round(avg(durations)),
      successRateLastN: done.length ? round((succ / done.length) * 100, 1) : null,
      deployments
    }
  }
  // Fallback: derive from jobs whose name contains "deploy".
  const deployJobs = jobRecords.filter((j) => DEPLOY_HINTS.some((r) => r.test(j.name)))
  if (deployJobs.length) {
    const durations = deployJobs.map((j) => j.durationMs)
    const done = deployJobs.filter((j) => j.conclusion)
    const succ = done.filter((j) => j.conclusion === 'success').length
    return {
      source: 'actions_jobs',
      latestStatus: deployJobs[0]?.conclusion ?? null,
      latestDurationMs: deployJobs[0]?.durationMs ?? null,
      avgDurationMs: round(avg(durations)),
      successRateLastN: done.length ? round((succ / done.length) * 100, 1) : null,
      deployments: []
    }
  }
  return {
    source: 'unavailable',
    reason: 'No GitHub Deployments and no deploy-named jobs found.',
    latestStatus: null,
    latestDurationMs: null,
    avgDurationMs: null,
    successRateLastN: null,
    deployments: []
  }
}

/* --------------------------------------------------------------------- shapes */
function emptyRaw() {
  return {
    runs: [],
    runsSummary: null,
    jobs: { queriedRuns: 0, count: 0, byName: [], slowestJob: null, heatmap: [] },
    flakyProxy: { unstableJobsCount: 0, unstableJobs: [], rate: null },
    artifacts: { count: 0, totalSizeBytes: 0, avgSizeBytes: 0, metricsArtifactsCount: 0, dashboardArtifactsCount: 0, latest: [] },
    pullRequests: { count: 0, mergedCount: 0, detailed: 0, list: [], buckets: null },
    deploy: { source: 'unavailable', latestStatus: null, latestDurationMs: null, avgDurationMs: null, successRateLastN: null, deployments: [] }
  }
}

function numOrUnavail(v, reason) {
  return typeof v === 'number' && Number.isFinite(v) ? ok(v) : unavailable(reason)
}
