# SignalOps · Dynamic metrics pipeline

Collects **real, automatically-measurable** delivery-cost metrics for the three SignalOps
variants (`flow`, `friction`, `overfit`), scores them transparently, and produces the JSON
the [metrics dashboard](../../apps/metrics-dashboard) renders.

> **Honesty contract.** No number here is hand-typed. Anything not measurable in a given run
> is emitted with `status: "unavailable"` (or `"error"`) and a reason — never a faked value.

---

## Quick start

```bash
# 1. Collect (fast, static — safe to run anywhere, no builds required)
pnpm metrics:dynamic

# 2. See it
pnpm metrics:dashboard          # dev server (Vite)  → http://localhost:5173
# or build the static site:
pnpm metrics:dashboard:build    # collects + builds apps/metrics-dashboard/dist
```

The bundle metrics read each variant's build output, so for the richest data build the
variants first (`pnpm build:flow`, the friction/overfit build scripts, `next build`, …).
Missing output degrades gracefully to `pending`.

### Optional: real build/CI timings (heavy)

```bash
pnpm metrics:dynamic:timings    # actually runs build/typecheck/test/lint and times them
```

Timings are opt-in because they cost minutes and need the full toolchain. Without the flag
those metrics show as `pending` with the exact command to reproduce.

---

## What comes out

```
tools/metrics/results/
├── ci/
│   ├── flow.json        # variant-level CI artifact (build/test/docker) — produced by the CI matrix
│   ├── friction.json    #   or `pnpm metrics:variant --variant <id>`; read back by collectors/variant-ci
│   └── overfit.json
├── latest/
│   ├── flow.json        # full, self-describing per-variant metrics + scores
│   ├── friction.json
│   └── overfit.json
├── summary/
│   └── latest.json      # ← the single file the dashboard imports (all variants + config)
└── history/
    └── <iso>_<sha>/summary.json   # immutable snapshot per run (git-ignored; CI artifact)
```

Every metric entry is self-describing:

```jsonc
{
  "value": 216.1,
  "status": "ok",              // ok | unavailable | error
  "label": "JS bundle (gzip)",
  "unit": "kb",
  "direction": "lower",        // lower | higher | balance | neutral
  "category": "Bundle",
  "axis": "Run",
  "description": "…",
  "reason": "…"                // present when status ≠ ok
}
```

---

## Architecture

```
collect.mjs ── orchestrates everything, writes results, prints the ranking
├── collect-variant.mjs   CLI: run ONE variant's real CI + Docker → results/ci/<variant>.json
├── lib/
│   ├── fsutil.mjs        walk + classify files (git-free, works sandboxed)
│   ├── projectgraph.mjs  workspace graph from package.json + Cargo.toml (no `nx graph` — it times out)
│   ├── exec.mjs          timed command runner (timings + variant runner)
│   ├── variant-runner.mjs  runs a variant's build/typecheck/lint/test, parses tests/warnings/RAM, sizes dist, drives Docker
│   ├── docker.mjs        best-effort docker build / image inspect / run+health probe
│   └── metric.mjs        ok()/unavailable()/error() helpers, real gzip/brotli
├── collectors/
│   ├── metadata.mjs      commit, branch, CI ids, environment, URLs
│   ├── architecture.mjs  files, LOC (fe/be/test/docs), config, TODO, `any`, complexity, business ratio
│   ├── dependencies.mjs  direct deps (transitive = unavailable, documented)
│   ├── graph.mjs         nodes/edges/density/fan-in-out, circular deps, central projects
│   ├── bundle.mjs        JS/CSS/img/font sizes + REAL gzip & brotli, chunks
│   ├── build.mjs         opt-in build/typecheck/test/lint timings
│   ├── variant-ci.mjs    reads results/ci/<variant>.json → variant.* metrics (scope:'variant')
│   ├── delivery.mjs      deployment/diagnosis surface parsed from the variant's real Dockerfiles
│   ├── change-surface.mjs contract-propagation cost (hand-written restatements of the shared Signal shape)
│   ├── github.mjs        GitHub Actions / PR / deploy pipeline (scope:'repo')
│   ├── lighthouse.mjs    parses .lighthouseci reports (perf, a11y, LCP, CLS, TBT, CO₂…)
│   └── placeholders.mjs  runtime/axe → declared pending with wiring seam
├── score.mjs             normalization + score groups + headline
└── config/
    ├── variants.config.json   per-variant source roots, dist, URLs, timing cmds + `ci` block (commands + docker)
    └── scoring.config.json    metric catalog + weights (the single source of truth)
```

Robustness: every collector is wrapped so one failure can't take down the run; it becomes an
`error` entry with the message.

---

## Scoring (transparent & configurable)

All of this lives in [`config/scoring.config.json`](config/scoring.config.json) — edit it and
the dashboard reflects the change on the next collect.

1. **Normalize** each metric to 0–100 across the three variants with a **ratio-to-best**
   rule (100 = best), oriented by `direction`: for lower-is-better, `score = 100 × best ÷ value`
   (higher-is-better inverts it); counts are +1-smoothed so a zero best never divides by zero.
   Unlike min-max, this keeps scores *proportional* — a 5% gap and a 5× gap no longer look the
   same, and the worst variant is never forced to 0. Structural metrics (`nxProjects`,
   `locTotal`, …) use a **balance** score instead: both a monolith and over-fragmentation are
   penalized; the healthy band is defined in `balanceBands`.
2. **Score groups** (the 4 axes + derived scores) = weighted mean of their members;
   `unavailable` members are dropped and weights renormalized (`coverage` is reported).
   Axes below `axisCoverageMin` become `pending` instead of a misleading 0. Every scored axis
   member is **`scope:'variant'`** — repo-level metrics tie across variants by construction,
   so they are displayed as context but never scored.
3. **Total Delivery Score** = weighted mean over the axes actually measured, with **Change
   weighted highest (0.50)** — change/maintenance is the majority of lifetime cost — then
   Build 0.20 (the feedback loop is paid dozens of times a day) and Ship/Run 0.15 each.

The four axes, in one sentence each (members in `scoreGroups`):

- **Build** — the price of one trustworthy signal: full cold validation (build+typecheck+
  lint+test, caches off) and the same gates re-run **warm** with the variant's real caches.
- **Ship** — the price of turning a validated change into running software: services to
  build/push/deploy, deploy-guard (HEALTHCHECK) coverage, image size and no-cache image build.
- **Run** — the price of understanding production: runtimes to inspect, dedicated health
  endpoint coverage, container time-to-healthy. (Lighthouse is deliberately *not* here — it
  measures product quality, not diagnosability.)
- **Change** — the price of the next modification (dominant), in two families:
  **observed (0.60)** — the measured footprint of the controlled change experiment (the
  risk-trend capability, one spec implemented in all three variants; collector:
  `change-experiment.mjs`, no expected number exists anywhere); and **structural (0.40)**
  — contract restatements + hygiene signals that explain WHY it propagated that way.
  `tools/metrics/sensitivity.mjs` proves the verdict does not hinge on the Change weight.

### Model freeze — `modelVersion: "1.0"`

The scoring model is **frozen for the experiment** (final coherence audit, 2026-07-05).
Definition lives in one file: [`config/scoring.config.json`](config/scoring.config.json).

- **Why these axes**: Build/Ship/Run/Change are the four moments a change pays for —
  signal, delivery, operation, next modification. Change dominates (0.50) because most of
  a product's life is modification; Build 0.20 (paid tens of times a day), Ship/Run 0.15.
- **What is scored**: only `scope:'variant'` metrics; 2–4 members per axis for Build/Ship/
  Run, footprint+structure for Change. Every score is ratio-to-best, variant-agnostic.
- **What is context only**: test-support surface (classification is language-idiom
  sensitive), total/generated footprint, CI feedback (observational), RAM peaks,
  bundle/Lighthouse/product-quality metrics (local excellence ≠ delivery cost).
- **What is excluded and why**: linesChanged (no honest baseline for Overfit),
  boundariesCrossed (no variant-agnostic taxonomy), repo-level GitHub metrics (tie by
  construction), Lighthouse in the verdict (product quality).
- **Known, documented dependencies** (leave-one-out): the verdict rests on
  `variant.ci.validation.warm` — remove it and Friction wins, i.e. the ranking encodes the
  lab's central claim that the DAILY feedback loop outweighs the cold one. `nxProjects`
  (balance band) is worth ±0.5 pt on the Flow/Friction gap. Ranking is stable for Change
  weights 35–60% and flips to Friction at ≈70%.
- **Rules after freeze**: collection bug fixes allowed; any semantic change to what is
  scored or how requires bumping `modelVersion`. The defense scores must be reproducible
  by this exact model (`explain-score.mjs`, `sensitivity.mjs`, `leave-one-out.mjs`).

### Provenance of the published verdict

The deployed dashboard must show numbers measured at the SAME commit as the deployed
applications. `release.yml` re-runs the full matrix + collection at the release SHA and
`tools/metrics/verify-summary.mjs` gates both the release job and the gateway image build:
a SHA mismatch or a missing scored axis member fails the publication (local/dev builds
with `APP_COMMIT_SHA=unknown` skip the SHA check and only warn). The committed
`results/summary/latest.json` is the local/dev snapshot — the published one is always a
product of the pipeline.

Derived scores: `build`, `ship`, `run`, `change` (axes) + `uxQuality`, `accessibility`,
`sustainability`, `architectureComplexity`, and the headline `totalDeliveryScore`.

---

## Metrics supported today

| Category | Status |
|---|---|
| **Metadata** (commit, branch, CI ids, env, URLs) | ✅ |
| **Architecture / repo** (files, LOC fe/be/test/docs, config, TODO, `any`, `as unknown as`, lint-disables, cyclomatic complexity approx, files/fns over threshold, business ratio) | ✅ |
| **Graph** (nodes, edges, density, fan-in/out avg+max, circular deps, central/isolated projects) | ✅ |
| **Bundle** (JS/CSS raw + **real gzip/brotli**, chunk counts, largest chunk, images, fonts, dist total, top chunks) | ✅ (needs a build) |
| **Dependencies** (direct) | ✅ · transitive = documented `unavailable` |
| **Runtime UX** (Lighthouse perf/a11y/best-practices, LCP, CLS, TBT, Speed Index, FCP, requests, transferred, CO₂ est.) | ✅ for variants with a Lighthouse report · `pending` otherwise |
| **GitHub delivery pipeline** (CI wall/queue time avg·median·p95, success rate, per-job durations, job-level flaky proxy, artifacts, PR shape, deployments) — `scope:'repo'` | ✅ with a token · `unavailable` otherwise — see [GitHub API integration](#github-api-integration) |
| **Variant-level CI** (per-variant build/typecheck/lint/test duration + peak RAM, tests executed/passed/failed/skipped, warning/error counts, dist size) — `scope:'variant'` | ✅ with a CI artifact · `pending` otherwise — see [Variant-level CI metrics](#variant-level-ci-metrics) |
| **Variant-level Docker** (image size, build time, layer count + largest layer, startup, healthcheck) — `scope:'variant'` | ✅ best-effort with Docker · `pending` otherwise |
| **Build/CI timings** (build, typecheck, test, lint) via the static collector | ⏳ opt-in `--timings` (superseded by the variant CI matrix for scoring) |

## Intentionally **not** measured in this pass (declared `pending`, with wiring seam)

`runtime` (live probing of a deployed URL) · `frontendErrors` (Playwright) ·
`axe` (axe-core). See [`collectors/placeholders.mjs`](collectors/placeholders.mjs) — each lists
the exact file/approach to wire it. Also out of scope by design (manual): human
comprehension/debug time, add-a-field scenarios, AI-task benchmarks, subjective scores.

---

## Adding a metric

1. Add its key to `metrics` in `scoring.config.json` (label, category, axis, unit, direction,
   collector, description). Optionally add it to a `scoreGroups` member list with a weight, and
   a `balanceBands` entry if it has a healthy middle.
2. Emit it from the relevant collector with `ok()` / `unavailable()` / `error()`.
3. `pnpm metrics:dynamic` — the dashboard picks it up automatically (table, tooltips, scoring).

## CI

`.github/workflows/metrics.yml` has four jobs:

- **`shared-metrics`** — socle acceptance (typecheck/test/seed metrics).
- **`variant-metrics`** — a **matrix over `[flow, friction, overfit]`** (`fail-fast: false`): each
  job runs that variant's real build/typecheck/lint/test + Docker probe and uploads
  `metrics-variant-<variant>` (its `results/ci/<variant>.json`).
- **`aggregate-metrics`** — depends on the matrix, downloads the three artifacts back into
  `results/ci/`, runs `pnpm metrics:dynamic` (folding variant-level + repo-level GitHub
  metrics), builds the dashboard, uploads `metrics-results` + `metrics-dashboard`.
- **`dynamic-timings`** — the heavy `--timings` pass, on `workflow_dispatch`.

The matrix is **measurement-only and non-gating**: a variant that fails records the failure in
its JSON (read as `unavailable`) without cancelling the others — the real gates are the
per-variant `*-ci.yml` workflows.

---

## Variant-level CI metrics

The [GitHub API metrics](#github-api-integration) are **`scope:'repo'`**: the three variants
share one monorepo CI pipeline, so those numbers describe the *shared* delivery chain and
**tie across variants** (they enrich context but can't compare Flow vs Friction vs Overfit).

To get numbers that *do* compare the variants, a **matrix job per variant** runs that variant's
own commands and Docker build, and writes a self-describing artifact
(`results/ci/<variant>.json`) that the [`variant-ci`](collectors/variant-ci.mjs) collector reads
back as **`scope:'variant'`** metrics. Those are what the scoring uses to differentiate the
Build and Ship axes.

**Which metrics become comparable** (all `scope:'variant'`):

| Group | Keys |
|---|---|
| Build / validation | `variant.ci.validation.{cold,warm}` (scored), `variant.ci.build.duration`, `variant.ci.typecheck.duration`, `variant.ci.lint.duration`, `variant.ci.test.duration`, `variant.ci.tests.{executed,passed,failed,skipped}`, `variant.ci.{warnings,errors}.count`, `variant.ci.ramPeak.{build,tests}`, `variant.ci.artifact.distSize` |
| Docker | `variant.docker.build.duration`, `variant.docker.image.size`, `variant.docker.layers.count`, `variant.docker.layer.maxSize`, `variant.docker.startup.duration`, `variant.docker.healthcheck.{status,duration}` |
| Delivery surface (static, from Dockerfiles) | `ship.services.count`, `ship.healthcheck.coverage`, `run.inspection.surfaces`, `run.health.coverage` |
| Change surface (static) | `change.contract.restatements` (with the real file list in `files`) |

Cold vs warm: the runner executes each variant's four gates twice — first with caches
disabled (`commands`, the intrinsic worst case), then immediately again with the variant's
real cache strategy (`warmCommands`, or the same commands if the variant has no cache story).
Warm is the everyday "is my change still green?" price and carries most of the Build weight.
Each variant's commands cover its ENTIRE own code (Flow: every `scope:flow` project via
`nx run-many`; Overfit: its TS gates chained with the Rust workspace's `cargo` gates —
excluding cargo would hide its real polyglot burden).

The per-variant commands + Docker descriptor live in
[`config/variants.config.json → ci`](config/variants.config.json) — the abstraction layer that
smooths over the heterogeneous toolchains (nx, pnpm filters, next/cargo).

**Run a variant collection locally** (no token needed — it just executes the scripts):

```bash
pnpm metrics:variant --variant flow          # build + typecheck + lint + test + docker probe
pnpm metrics:variant --variant friction --no-docker   # skip the Docker steps
pnpm metrics:variant --variant overfit --steps typecheck,lint   # only some steps
pnpm metrics:variant:all                      # all three, sequentially
# then fold the artifacts into the summary:
pnpm metrics:dynamic
```

Peak-RAM numbers need GNU/BSD `/usr/bin/time`; where it's absent they read `unavailable`.
Docker is strictly best-effort: no daemon or no Dockerfile ⇒ the Docker metrics are `pending`,
never a faked size.

**Read the artifacts** — in CI, download `metrics-variant-flow` / `-friction` / `-overfit`
(each contains one `<variant>.json`), or after `aggregate-metrics`, the merged
`metrics-results` (which includes `results/ci/*.json`).

**Verify in the JSON:**

```bash
# the raw per-variant CI artifact
cat tools/metrics/results/ci/flow.json | jq '.steps.build.durationMs, .docker.imageStats.sizeKb'

# after metrics:dynamic — confirm it landed as a scored, variant-scoped metric
jq '.variants[] | {v: .meta.variant, build: .metrics["variant.ci.build.duration"].value, scope: .metrics["variant.ci.build.duration"].scope}' \
  tools/metrics/results/summary/latest.json

# confirm the repo-level GitHub metrics stayed scope:'repo'
jq '.githubMetrics["ship.ci.wallTime.avg"].scope' tools/metrics/results/summary/latest.json
```

Winners and normalization only ever compare `scope:'variant'` metrics; `scope:'repo'` metrics
are applied identically to all three (they tie), so they never fake per-variant differentiation.

---

## GitHub API integration

The `github` collector ([`collectors/github.mjs`](collectors/github.mjs)) reads the **real
delivery pipeline** from the GitHub REST API and enriches the **Ship** and **Change** axes. It
is **repo-level**: the three variants share one monorepo pipeline, so these numbers describe the
shared delivery chain — they tie across variants when scored (never faking per-variant
differences) and are surfaced as repo-level in the dashboard.

### What it collects

| Group | Metrics (raw + normalized) |
|---|---|
| **Workflow runs** | count, success/failure/cancelled/skipped, `successRate`, wall time latest·avg·median·p95, queue time avg, latest run status/conclusion/url |
| **Jobs** | per-job avg·median·p95·max duration, success/failure rate, slowest job, run×job matrix |
| **Flaky proxy** | job-level *instability* proxy — a job that both passed **and** failed across the sampled runs. **Not** a test-level flaky rate (documented as such). |
| **Artifacts** | count, total/avg size, metrics- & dashboard-artifact counts, latest list |
| **Pull requests** | merged count, avg/median changed files, additions/deletions, time-to-merge, review count/comments, best-effort file-path buckets (flow/friction/overfit/dashboard/config) |
| **Deployments** | latest status, avg duration, success rate — from the Deployments API, else derived from `deploy`-named jobs (`source: deployments_api \| actions_jobs \| unavailable`) |

Normalized metric keys fed to scoring: `ship.ci.wallTime.avg`, `ship.ci.wallTime.p95`,
`ship.ci.successRate.lastN`, `ship.ci.flakyProxy.rate`, `ship.ci.artifacts.totalSize`,
`ship.deploy.avgDuration`, `change.pr.avgChangedFiles`, `change.pr.avgAdditions`,
`change.pr.avgDeletions`, `change.pr.avgTimeToMerge`, `change.pr.avgReviewCount`
(all `scope: "repo"` in `scoring.config.json`). Raw data lands under `github` in
`summary/latest.json`; the run-over-run trend lands under `history`.

### Failure policy (never breaks the pipeline)

- **No token** → every GitHub metric is `unavailable` with a reason; the rest of the run is
  unaffected and the Ship/Change scores fall back to their differentiating members.
- **Rate limit / API error / timeout** → partial data is kept, the missing pieces are
  `unavailable`, and the collector never throws.
- The token is used **only** inside [`lib/github-client.mjs`](lib/github-client.mjs) — it is
  never logged, returned, or written to any results file.

### Permissions

The workflow declares the read-only scopes the collector needs:

```yaml
permissions:
  contents: read
  actions: read        # workflow runs, jobs, artifacts
  pull-requests: read  # PR shape
  packages: read       # not used yet — documented seam for a future GHCR image-size read
```

### Running in CI

`github.token` already carries those scopes for the current repo — **no repo secret needed**.
`metrics.yml` passes:

```yaml
env:
  METRICS_GITHUB_TOKEN: ${{ github.token }}
  METRICS_GITHUB_REPOSITORY: ${{ github.repository }}
  METRICS_GITHUB_RUN_LIMIT: '20'
  METRICS_GITHUB_PR_LIMIT: '20'
```

### Running locally

Create an un-committed **`.env.metrics.local`** at the repo root (already git-ignored):

```bash
METRICS_GITHUB_TOKEN=github_pat_xxx        # fine-grained PAT, read-only Actions + PRs
METRICS_GITHUB_REPOSITORY=owner/repo       # else derived from the git origin remote
METRICS_GITHUB_RUN_LIMIT=20
METRICS_GITHUB_PR_LIMIT=20
METRICS_GITHUB_WORKFLOWS=ci.yml,metrics.yml,deploy.yml   # optional focus list
```

Then `pnpm metrics:dynamic`. Token resolution order:
`METRICS_GITHUB_TOKEN` → `GITHUB_TOKEN` → `GH_TOKEN` → *unavailable*. Repository resolution:
`METRICS_GITHUB_REPOSITORY` → `GITHUB_REPOSITORY` → parsed from `git remote get-url origin`.

### Secrets: where they go (and don't)

| Place | What |
|---|---|
| **Local** | `.env.metrics.local` (never committed). |
| **GitHub Actions** | Nothing to create for the current repo — `github.token` is enough. A cross-repo read would need a PAT stored as a repo/org **secret**. |
| **Dokploy / static host** | **Nothing.** The dashboard is a static build with the data baked in at CI time. A token must never reach the frontend, and there are no `VITE_*` token vars — the browser bundle contains only the collected JSON. |

### GitHub Packages / GHCR (optional seam, not required here)

`lib/env.mjs` reads `METRICS_GHCR_TOKEN` / `METRICS_GHCR_PACKAGES` but nothing depends on them
yet. Docker image size stays computed via Docker locally/in CI (`docker image inspect`,
`docker history`, `docker buildx imagetools inspect`). The GitHub **Packages** API needs a
*classic* PAT with `read:packages` (fine-grained tokens don't cover it) — wire that only if a
future pass reads GHCR image sizes.
