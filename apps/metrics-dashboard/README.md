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

## The page is a demonstration, not a monitoring dashboard

Five moments, in reading order (see `src/App.tsx`):

1. **Verdict** — the podium: Total Delivery Score + the four axis scores per variant.
2. **Why** — *"Small looks cheap. Safe-to-change is cheap."*: a two-board contrast between
   single-metric trophies (cold validation, bundle size, code hygiene — where Friction and
   Overfit genuinely win) and delivery-cost readings (warm re-validation, contract copies to
   sync, services per release — where Flow wins). Winners are computed from the data,
   never named in code.
3. **The next change** — observation first, explanation second: the measured footprint of the
   SAME product change implemented in all three variants (the risk-trend experiment,
   change-experiment collector), then the contract copies that explain why it spread
   (change-surface collector). Real file counts and paths; no expected number exists in code.
4. **Shape** — the three dependency graphs side by side: the propagation cost is architectural,
   not accidental.
5. **Evidence** — the axis dot-plot, one card per axis with its scored members (real value +
   ratio-to-best bar), the "local quality" card (real, deliberately not the verdict), and the
   full sortable/filterable metric table.

Every visual distinguishes a real value from `pending` (hatched bars / dashed markers) so an
unmeasured metric is never mistaken for a bad score.

Only `scope:'variant'` metrics are scored — repo-level GitHub-pipeline data (shared monorepo
CI, identical for the three variants) remains in the collected JSON and the metric table as
context but no longer occupies the page. The components that used to render it
(`GitHubActions`, `PullRequests`, `HistoryLines`, `RunTimeline`, `JobBars`, `JobHeatmap`,
`PositioningPlot`, `Treemap`) are no longer imported by `App.tsx`.

**No token ever reaches the browser.** GitHub is queried only in the Node collector; this app is
a static build with the resulting JSON baked in. There are **no `VITE_*` token variables**.
