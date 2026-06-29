# 03 — Fixtures (`@signalops/fixtures`)

A **deterministic** dataset generator. Every variant builds its mock backend from the SAME data, so
runtime comparisons are fair.

## Generate

```bash
pnpm fixtures:generate
```

Writes six files into `packages/fixtures/data/` (git-ignored):

| File                   |              Volume |
| ---------------------- | ------------------: |
| `signals.json`         |              10,000 |
| `incidents.json`       |                 300 |
| `analysts.json`        |                  25 |
| `sources.json`         |                  12 |
| `events.json`          |              50,000 |
| `dx-metrics.seed.json` | 3 (one per variant) |

## Determinism

- A single fixed seed (`DEFAULT_SEED = 20260629`) drives a small mulberry32 PRNG (`src/random.ts`).
- All dates are anchored to a fixed `REFERENCE_NOW` (2026-06-29) and spread over the prior 90 days —
  the dataset never depends on the wall clock.
- Same seed → byte-identical output on every machine and in CI.

## Coherence guarantees

- Every signal: valid `severity`/`status`/`source`, `riskScore ∈ [0,100]`, `confidence` `null` or
  `∈ [0,1]`, 1–4 tags. `riskScore` is biased by severity for realism.
- ~5% of signals have `confidence: null` (exercises "Confidence unavailable").
- Incidents reference **existing** signal ids and flip `hasLinkedIncident` on those signals.
- Timeline events reference **existing** signal ids, dated at/after their signal's creation.
- `resolvedAt` is set iff an incident's status is `resolved`.

These invariants are asserted in `src/fixtures.test.ts`.

## Programmatic use

```ts
import { generateAll, generateSignals, Random, DX_METRICS_SEED } from '@signalops/fixtures'

const data = generateAll() // { analysts, sources, signals, incidents, events, dxMetricsSeed }
```

No network access — everything is generated locally.
