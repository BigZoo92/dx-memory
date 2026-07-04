# 05 — CI strategy

Five GitHub Actions workflows live in `.github/workflows/`:

| Workflow          | Purpose                                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| `flow-ci.yml`     | Variant B (Flow) quality gate. Isolated to `scope:flow` + `scope:shared`. Pragmatic 2-layer cache. |
| `friction-ci.yml` | Variant A (Friction) quality gate. Isolated by exact `pnpm --filter`. pnpm-store cache only.    |
| `overfit-ci.yml`  | Variant C (Overfit) quality gate. Isolated by graph-closure proof. Deliberately excessive cache. |
| `metrics.yml`     | The measurement pipeline: repo-level (GitHub API) + variant-level matrix. Non-gating.           |
| `release.yml`     | Tagged release: build+push all images, deploy, smoke.                                           |

The `*-ci.yml` are **quality gates** (they fail the build on a real regression). `metrics.yml`
is **measurement** (best-effort probes; a failed probe records `unavailable`, it does not gate).
Keeping these two concerns separate is what lets the metrics stay honest.

## Variant CI isolation (the anti-contamination rule)

A variant's CI must validate **only that variant plus the shared packages it truly depends on** —
never another variant's projects. Otherwise a Flow CI run that also builds/lints Overfit both
mis-attributes cost and can fail Flow for an Overfit bug. Isolation is enforced **by the real Nx
dependency graph**, not by name matching.

Every project carries a `scope:*` Nx tag (`packages/*/package.json` `nx.tags` or `project.json`):

| Scope             | Projects | Notes                                                              |
| ----------------- | -------- | ------------------------------------------------------------------ |
| `scope:flow`      | 15       | flow-app + 14 `packages/flow/*`                                    |
| `scope:overfit`   | 16       | overfit-web + overfit-api + 14 `packages/overfit/*`               |
| `scope:friction`  | 2        | friction-api, friction-web (no workspace dependencies)            |
| `scope:shared`    | 4        | contracts, fixtures, ui-spec, test-scenarios (the variant-agnostic socle) |
| `scope:lab` / `scope:metrics` | 3 | lab-web, metrics-dashboard, @signalops/metrics — never in a variant gate |

Selection is by tag selector, verified against the real graph closure:

- **Flow** runs `--projects=tag:scope:flow,tag:scope:shared` → exactly 19 projects, which equals
  `flow-app`'s full transitive closure. Flow genuinely depends on the four shared socle packages.
- **Overfit** runs `--projects=tag:scope:overfit` → 16 projects. Overfit is **self-contained**: it
  consumes no shared socle package (it generates its own contracts via `overfit-contracts-generated`),
  so `scope:shared` is *forbidden* in Overfit's closure.
- **Friction** targets the two projects by exact `pnpm --filter @signalops/friction-{api,web}`. Its
  Nx closure is empty (standalone), so no shared package is pulled in.

### Guards

- Flow: `scripts/flow/ci-scope-guard.mjs` (pragmatic — one Nx call + a set-intersection).
- Overfit: `tools/overfit-ci/verify-isolation.mjs` driven by `scope-manifest.json` (deliberately
  sophisticated — materializes the graph, proves `closure == scope:overfit`, detects any
  foreign-scope node or cross-variant edge, emits `overfit-isolation.json`).

### Isolation is enforced on EVERY blocking step, not just the Nx commands

Two subtle traps were fixed here:

1. **`nx affected` ignores `--projects`.** In Nx 20.8.4, `nx affected -t … --projects=tag:…` silently
   drops the filter and runs *all* affected projects (incl. other variants). The correct tag filter
   for `affected` is `--exclude='*,!tag:scope:flow,!tag:scope:shared'`, which yields
   `affected ∩ (scope:flow ∪ scope:shared)`. (`nx run-many` *does* honor `--projects`.)
2. **`audit:flow:knip` must be Flow-scoped too.** `knip.flow.json` originally analyzed the whole
   root workspace, so dead code in `apps/metrics-dashboard`, `tools/metrics` and `infra/gateway`
   (none in Flow's closure) failed Flow CI. It now ignores the non-Flow workspaces and scopes the
   root workspace to `scripts/flow/**`. A dead export in metrics-dashboard can no longer fail Flow.

The rule: a `flow:*` / `audit:flow:*` command must audit **Flow**, not "the whole repo from Flow's CI".

## Parity of quality gates

All three variant CIs run the **same five gate categories** so the CI signal is comparable, even
though the toolchains differ:

| Gate       | Flow                       | Friction                | Overfit                                   |
| ---------- | -------------------------- | ----------------------- | ----------------------------------------- |
| format     | oxfmt (Flow scope)         | Prettier                | Prettier (TS) + `cargo fmt` (Rust)        |
| lint       | oxlint (Nx)                | ESLint                  | oxlint (Nx) + `cargo clippy`              |
| typecheck  | tsc (Nx)                   | tsc                     | tsc (Nx)                                  |
| test       | vitest (Nx)                | vitest                  | vitest (Nx) + `cargo test`                |
| build      | vite (Nx) + Docker (main)  | vite/tsc + Docker       | next + tsc (Nx) + `cargo build` + Docker  |

Durations, project counts and test counts differ by design — that difference is the subject of the
lab. The **structure** of the signal is what stays constant. Variant-level measurement (build /
typecheck / lint / test cost + Docker probe) is owned by `metrics.yml`'s matrix and is comparable
across all three (see `tools/metrics/config/variants.config.json`).

### Common protocol vs variant-specific practices, and trigger parity

The **common experimental protocol** (compared across variants, and the only thing folded into the
scored `variant.ci.*` metrics) is: **format · lint · typecheck · test · build**. Everything else is
a **variant-specific engineering practice**, clearly labelled as such and NOT part of the compared
cold metric:

- Flow: knip (dead-code) · dependency-cruiser boundaries · madge cycles · AI-PR governance · a11y (advisory).
- Friction: none beyond the common protocol (its cost story is the tangle, not extra gates).
- Overfit: contract-determinism · schema/docs/policy/bundle quality gates · graph-closure isolation proof · Rust `cargo fmt`/`clippy`/`test`/`build`.

**Trigger parity.** Per trigger, the common protocol is identical across variants:

- **Pull request:** format/lint/typecheck/test/build for all three (Flow via `nx affected ∩ flow`, Friction/Overfit full). No Docker on PR for any variant.
- **Push to main:** the same five gates + a Docker build for all three.

Docker is a `main`-only ship-time gate for **all three** variants (Flow already did this; Friction
and Overfit were building images on every PR — that asymmetry was removed so PR feedback stays
trigger-comparable).

## Cache strategy — two philosophies, on purpose

The cache layers are where Flow and Overfit diverge most visibly. Both are **correct** (no stale or
invalid builds); they differ in the ratio of gain to complexity.

### Flow — pragmatic (2 layers)

1. **pnpm store** — `actions/setup-node` with `cache: pnpm`, keyed on `pnpm-lock.yaml`.
2. **Nx local cache** — `.nx/cache` via `actions/cache`, keyed on `os + lockfile + sha` with
   `restore-keys` for warm partial hits. Nx invalidates each task by its own input hash, so a stale
   entry is never replayed.

Flow **deliberately stops here**: no Docker layer cache (the image only builds on `main`), no remote
cache, no warm-up job. Combined with `nx affected` on PRs, this is the sweet spot for a repo this
size. Knowing where to stop optimizing is Flow's whole thesis.

### Overfit — deliberately excessive (6 layers + warm-up + key calculator)

Six explicit `actions/cache` layers, each with a content-hash primary key and a two-step
`restore-keys` cascade, all derived by a dedicated calculator (`tools/overfit-ci/cache-key.mjs`):

| # | Layer            | Path                       | Invalidated by                                   |
| - | ---------------- | -------------------------- | ------------------------------------------------ |
| 1 | pnpm store       | `$(pnpm store path)`       | `pnpm-lock.yaml`                                 |
| 2 | Nx local cache   | `.nx/cache`                | `pnpm-lock.yaml`, `nx.json`, `tsconfig.base.json`|
| 3 | cargo registry   | `~/.cargo/registry`        | `Cargo.lock`                                     |
| 4 | cargo git        | `~/.cargo/git`             | `Cargo.lock`                                     |
| 5 | cargo target     | `target`                   | `Cargo.lock`, `Cargo.toml`, crates, api src      |
| 6 | Next build cache | `apps/overfit-web/.next/cache` | lockfile, overfit-web app + next.config       |

Plus a `warm-cache` job that primes every layer on `main` so PR runs restore warm, and two dedicated
BuildKit GHA scopes for the Docker images (`scope=overfit-web`, `scope=overfit-api`). Overfit can
reach excellent build performance — but the number of moving parts to understand and keep correct is
objectively far higher than Flow's two blocks. Compare `overfit-ci.yml` to `flow-ci.yml` to see the
cost. See `tools/overfit-ci/README.md` for the full restoration cascade.

## Measurement fairness — two distinct duration metrics

There are two, deliberately separate, duration signals. Confusing them would bias the lab.

1. **Cold validation duration** (`variant.ci.*.duration`, scope:variant, **scored**). Measured by
   `metrics.yml`'s matrix with the build cache **disabled** (Flow `--skip-nx-cache`; Friction/Overfit
   run pnpm/cargo/next outside the Nx cache). This is the *intrinsic* cost of the validation protocol,
   cache-immune and directly comparable across variants. Labelled "… (cold)" with the cache-disabled
   nature stated in every description — it is **not** the real CI feedback time.

2. **Real CI feedback duration** (`variant.ci.feedback.duration`, scope:variant, **observational —
   not scored**). Definition **B**: `max(quality_job.completed_at) − run.run_started_at`, averaged
   over the variant's **push-to-main** runs of its own `*-ci.yml`, *with* that variant's real cache
   strategy (Flow: pnpm+Nx; Overfit: 6-layer + BuildKit; Friction: pnpm store only). Sourced purely
   from the GitHub Actions runs/jobs API — never a local stopwatch.
   - **Population = push-to-main only.** On `main` every variant runs its *full* scope (Flow
     `nx run-many` 19, Friction 2 apps, Overfit 15 JS + Rust), so samples are comparable AND free of
     the PR `nx affected` **no-op** problem (a cross-variant PR triggers flow-ci but affected selects
     0 flow projects; those PR runs are *not* counted — all PRs trigger all three CIs, there is no
     `paths` filter on `pull_request`).
   - **Timing B**, not job-execution-only: from run start to the quality signal; excludes only the
     GitHub queue (runner-availability noise).
   - **Conclusions:** success / failure / timed_out counted; cancelled / skipped excluded.
   - **Reruns:** one sample per run (latest attempt). Side jobs (Flow `a11y`, Overfit `warm-cache`)
     excluded via the `qualityJobs` allow-list in `variants.config.json`.
   - `unavailable` (with a reason) until a real push-to-main run exists; **not folded into any score**.

**Same categories ≠ same work.** A raw feedback duration cannot be read alone: the scopes differ by
an order of magnitude (Friction 2 projects / 31 files, Flow 15 / 180, Overfit 31 / 78 + 18 Rust
crates). Always read it next to the already-collected scope context: `nxProjects`, `sourceFiles`,
`locTotal`, `variant.ci.tests.executed`. Friction's CI being shortest is a *perimeter* artifact
(fewer projects, zero extra audits, no Rust), **not** evidence of better DX — consistent with the
total-cost-of-delivery thesis, where a thin, guard-rail-free pipeline is itself a friction signal.

The pair answers the lab's core question: *how much cache complexity buys how much feedback speed?*
Cold (1) is the protocol cost; feedback (2) is what the developer waits for. The repo-level
`ship.ci.wallTime.avg` (GitHub, scope:repo) remains the shared-pipeline signal and ties across
variants. No duration is ever mocked or hard-coded.

Non-automated metrics (error reproduction steps, docs pages needed) are logged by hand in
[`docs/results-log.md`](../results-log.md).
