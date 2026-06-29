# @signalops/metrics

Collects DX metrics into a comparable, machine-readable results file.

In this **socle pass** the inputs are seed/demo values (transcribed from the design spec). The
same pipeline is shaped to ingest _collected_ measurements later — that is the single place to
change: replace the loader output with real runs and flip `source` to `collected`.

## Run

```bash
pnpm metrics:collect      # writes packages/metrics/results/*.json
pnpm metrics:all          # fixtures:generate + metrics:collect
```

## Output

| File                           | Contents                                                   |
| ------------------------------ | ---------------------------------------------------------- |
| `results/results.json`         | full results: every variant + per-metric winners           |
| `results/<variant>.json`       | one `DxMetric` per variant (`friction`, `flow`, `overfit`) |
| `results/summary.json`         | source, timestamp and the winner of each metric            |
| `results/results.example.json` | committed template showing the expected shape              |

All generated files are git-ignored except `results.example.json`.

## Metrics

The 14 metrics and their axes come from
[`docs/product/02-measurement-protocol.md`](../../docs/product/02-measurement-protocol.md). Every
metric is "lower is better" **except** Lighthouse performance (`METRIC_LOWER_IS_BETTER` in
`@signalops/contracts` encodes this).

| Axis        | Metrics                                                                |
| ----------- | ---------------------------------------------------------------------- |
| Build       | install, typecheck, test, build time                                   |
| Ship        | Docker build time, CI duration                                         |
| Run / Front | bundle size, main chunk size, Lighthouse, table render time            |
| Change      | files touched (AI task), tests impacted, error repro steps, docs pages |

## Programmatic use

```ts
import { collectMetrics } from '@signalops/metrics'

const results = collectMetrics()
// results.variants  -> DxMetric[]
// results.winners   -> best variant per metric
// results.source    -> 'seed' | 'collected'
```

> ⚠️ Seed values are **not** final numbers. Per the measurement protocol, replace them with
> collected metrics before the defense.
