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
(axis dot-plot) · Architecture (D3 force graph) · Build & CI · Bundle (treemaps) · Runtime & UX
(Lighthouse) · Sustainability & a11y · full sortable/filterable metric table with compare mode.

Every visual distinguishes a real value from `pending` (hatched bars / dashed markers) so an
unmeasured metric is never mistaken for a bad score.
