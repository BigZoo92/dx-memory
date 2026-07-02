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
├── lib/
│   ├── fsutil.mjs        walk + classify files (git-free, works sandboxed)
│   ├── projectgraph.mjs  workspace graph from package.json + Cargo.toml (no `nx graph` — it times out)
│   ├── exec.mjs          timed command runner (timings collector only)
│   └── metric.mjs        ok()/unavailable()/error() helpers, real gzip/brotli
├── collectors/
│   ├── metadata.mjs      commit, branch, CI ids, environment, URLs
│   ├── architecture.mjs  files, LOC (fe/be/test/docs), config, TODO, `any`, complexity, business ratio
│   ├── dependencies.mjs  direct deps (transitive = unavailable, documented)
│   ├── graph.mjs         nodes/edges/density/fan-in-out, circular deps, central projects
│   ├── bundle.mjs        JS/CSS/img/font sizes + REAL gzip & brotli, chunks
│   ├── build.mjs         opt-in build/typecheck/test/lint timings
│   ├── lighthouse.mjs    parses .lighthouseci reports (perf, a11y, LCP, CLS, TBT, CO₂…)
│   └── placeholders.mjs  docker/ci/runtime/axe → declared pending with wiring seam
├── score.mjs             normalization + score groups + headline
└── config/
    ├── variants.config.json   per-variant source roots, dist, docker, URLs, timing cmds
    └── scoring.config.json    metric catalog + weights (the single source of truth)
```

Robustness: every collector is wrapped so one failure can't take down the run; it becomes an
`error` entry with the message.

---

## Scoring (transparent & configurable)

All of this lives in [`config/scoring.config.json`](config/scoring.config.json) — edit it and
the dashboard reflects the change on the next collect.

1. **Normalize** each metric to 0–100 across the three variants (100 = best), oriented by
   `direction`. Structural metrics (`nxProjects`, `locTotal`, …) use a **balance** score:
   both a monolith and over-fragmentation are penalized; the healthy band is defined in
   `balanceBands`.
2. **Score groups** (the 4 axes + 5 derived scores) = weighted mean of their members;
   `unavailable` members are dropped and weights renormalized (`coverage` is reported).
   Axes below `axisCoverageMin` become `pending` instead of a misleading 0.
3. **Total Delivery Score** = weighted mean over the axes actually measured, with **Change
   weighted highest** (change/maintenance is the majority of lifetime cost, and the only axis
   fully measured for all three variants today).

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
| **Build/CI timings** (build, typecheck, test, lint) | ⏳ opt-in `--timings` |

## Intentionally **not** measured in this pass (declared `pending`, with wiring seam)

`docker` · `ci` (provider API) · `runtime` (live probing) · `frontendErrors` (Playwright) ·
`axe` (axe-core). See [`collectors/placeholders.mjs`](collectors/placeholders.mjs) — each lists
the exact file/approach to wire it. Also out of scope by design (pass 2, manual): human
comprehension/debug time, add-a-field scenarios, AI-task benchmarks, subjective scores.

---

## Adding a metric

1. Add its key to `metrics` in `scoring.config.json` (label, category, axis, unit, direction,
   collector, description). Optionally add it to a `scoreGroups` member list with a weight, and
   a `balanceBands` entry if it has a healthy middle.
2. Emit it from the relevant collector with `ok()` / `unavailable()` / `error()`.
3. `pnpm metrics:dynamic` — the dashboard picks it up automatically (table, tooltips, scoring).

## CI

`.github/workflows/metrics.yml` runs the collector on push/PR, builds the dashboard, and
uploads both as artifacts. The heavy `--timings` pass runs on `workflow_dispatch`.
