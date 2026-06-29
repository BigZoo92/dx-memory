# 04 — Metrics (`@signalops/metrics`)

Turns DX metrics into a comparable, machine-readable results file.

## Collect

```bash
pnpm metrics:collect      # or: pnpm metrics:all (fixtures + metrics)
```

Writes into `packages/metrics/results/` (git-ignored except the committed example):

| File                                           | Contents                                         |
| ---------------------------------------------- | ------------------------------------------------ |
| `results.json`                                 | full results: every variant + per-metric winners |
| `friction.json` / `flow.json` / `overfit.json` | one `DxMetric` per variant                       |
| `summary.json`                                 | source, timestamp, winner per metric             |
| `results.example.json`                         | committed template (expected shape)              |

## Source of numbers

In the socle pass the values are **seed/demo** numbers, transcribed from
`docs/product/01-design-spec.md`. The collector prefers `packages/fixtures/data/dx-metrics.seed.json`
when present and falls back to the bundled `DX_METRICS_SEED` constant, so the command always works.

> ⚠️ Per `docs/product/02-measurement-protocol.md`, seed numbers are **not** final. Replace them
> with collected measurements before the defense. The results carry `source: 'seed'` until then.

The pipeline has a single merge point for real data: swap `loadMetrics()`'s output for collected
runs and flip `source` to `collected`.

## The 14 metrics

Lower is better for all of them **except** `lighthousePerformance`. This direction is encoded once,
in `METRIC_LOWER_IS_BETTER` (`@signalops/contracts`), and `computeWinners()` uses it to pick the
best variant per metric.

| Axis        | Metrics                                                                |
| ----------- | ---------------------------------------------------------------------- |
| Build       | install, typecheck, test, build time                                   |
| Ship        | Docker build time, CI duration                                         |
| Run / Front | bundle size, main chunk size, Lighthouse, table render time            |
| Change      | files touched (AI task), tests impacted, error repro steps, docs pages |

The narrative the data supports: **Flow** wins feedback-loop and cost-of-change metrics; **Overfit**
wins raw runtime/build/bundle but explodes change cost; **Friction** is slow across the board.
