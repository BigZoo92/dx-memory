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

## Measurement fairness

The variant workflows run on the same runner type, Node version and pnpm version. Variant-level build
/ typecheck / lint / test durations are measured **cold** (`--skip-nx-cache`) by `metrics.yml` so
they reflect intrinsic per-variant cost, independent of CI caching. The *cache effect* shows in the
repo-level CI wall-time signal (GitHub API), which is exactly where Flow's pragmatic cache and
Overfit's excessive cache are meant to differ. No duration is ever mocked or hard-coded.

Non-automated metrics (error reproduction steps, docs pages needed) are logged by hand in
[`docs/results-log.md`](../results-log.md).
