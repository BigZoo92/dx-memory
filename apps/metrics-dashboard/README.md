# @signalops/metrics-dashboard

An editorial, D3-powered dashboard that compares the **Flow / Friction / Overfit** variants on
the four axes of delivery cost. It renders the JSON produced by
[`tools/metrics`](../../tools/metrics) — it never computes metrics itself, so it stays fast and
the data is auditable.

```bash
pnpm metrics:dashboard          # dev  → http://localhost:5173
pnpm metrics:dashboard:build    # collect fresh metrics + build static site to dist/
```

## How it reads data

`vite.config.ts` aliases `@metrics` → `tools/metrics/results/summary/latest.json`, imported at
build time (baked into the bundle — no runtime fetch, deploy anywhere static). Re-run the
collector and rebuild to refresh.

## Stack & performance

- **Vite + React 19 + TypeScript**, **D3** (`d3-force`, `d3-scale`, `d3-hierarchy` only — no
  full-`d3` import) → ~94 KB gzip.
- Force simulation is run to rest **once** (no animation loop); charts are SVG and resize via
  `ResizeObserver`; sections reveal on scroll via `IntersectionObserver`.
- Colors are a **validated** categorical palette (dataviz validator: lightness band, chroma,
  contrast, and CVD separation ΔE 29.2 — all pass on the dark surface). See `src/lib/theme.ts`.

## Sections

Overview (podium + verdict) · Why Flow wins (leanness-vs-safety scatter) · Build·Ship·Run·Change
(axis dot-plot) · Architecture (D3 force graph) · **Build & CI** (variant-level) · **Docker**
(variant-level) · **GitHub Actions** (repo-level delivery pipeline) · Bundle (treemaps) · Runtime
& UX (Lighthouse) · Sustainability & a11y · **Pull requests** (repo-level) · **History** (trends) ·
full sortable/filterable metric table with compare mode.

Every visual distinguishes a real value from `pending` (hatched bars / dashed markers) so an
unmeasured metric is never mistaken for a bad score.

## Variant-level vs repo-level (scope badges)

Each section carries a **scope badge** so it's always clear what a number can and can't say:

- **`variant-level`** — measured per app, so it *compares* Flow / Friction / Overfit directly.
  The **Build & CI** and **Docker** sections show real per-variant CI-matrix numbers (build /
  typecheck / lint / test duration, peak RAM, image size, layers, startup); **Bundle** shows the
  per-variant browser payload. These drive the winners and the Build/Ship axis scores.
- **`repo-level`** — the shared monorepo delivery chain read from the GitHub API (**GitHub
  Actions**, **Pull requests**). Identical across the three variants, so it *ties*: it's context
  on the real cost of shipping, never a per-variant comparison.

The full metric table tags every row `variant` / `repo` too. Why the split exists (the GitHub API
only sees the shared pipeline; the CI matrix adds per-variant jobs) and how to reproduce it is in
the collector README's [*Variant-level CI metrics*](../../tools/metrics/README.md#variant-level-ci-metrics).

## GitHub Actions / delivery data

The **GitHub Actions**, **Pull requests** and **History** sections render the repo-level
delivery-pipeline data collected server-side by [`tools/metrics`](../../tools/metrics) — CI wall
time / success rate, a job-duration bar chart, a run×job stability heatmap, a recent-runs
timeline, artifact sizes, PR shape, and run-over-run trend lines. A **signal-confidence** badge
states how much of the pipeline was actually observable.

**No token ever reaches the browser.** GitHub is queried only in the Node collector; this app is
a static build with the resulting JSON baked in. There are **no `VITE_*` token variables**. When
the collector ran without a token, these sections show an explicit *"No signal"* state instead of
a fabricated number. Deploy the static build anywhere (Dokploy included) with **no** GitHub
secret on the host — see the collector README's *GitHub API integration* for how the data is
generated in CI.
