# Results log (manual metrics)

For metrics that are not automated — e.g. **error reproduction steps** and **docs pages needed** —
record each observation here, per `docs/product/02-measurement-protocol.md`.

One row per observation:

| Date       | Variant | Task               | Operator | Command / scenario                              | Observed value             | Note                                 |
| ---------- | ------- | ------------------ | -------- | ----------------------------------------------- | -------------------------- | ------------------------------------ |
| 2026-06-29 | flow    | Client bundle size | —        | `nx run flow-app:metrics` (`metrics.flow.json`) | 551 KB total / 429 KB main | **collected** (real); see note below |
| _e.g._     | flow    | Risk trend AI task | —        | scenario `validate-risk-trend-feature`          | _tbd_                      | run during the measurement pass      |

## Flow pass note (2026-06-29)

Variant B (Flow) is implemented. One real metric is collected today:

- **Bundle size: 551 KB (main chunk 429 KB)**, measured from `apps/flow-app/dist/client` by
  `pnpm nx run flow-app:metrics`.

This is deliberately **higher** than the seed/design placeholder on `/dx-metrics` (198 KB / 121 KB).
The seed values are transcribed from the design spec; the real TanStack Start + Router + Query +
Table + Virtual + React 19 client is heavier. Per the measurement protocol we do **not** overwrite
the seed with invented numbers — `/dx-metrics` still shows `source: seed`, and the collected number
lives in `metrics.flow.json` until the full measurement pass wires collected timings (install /
typecheck / test / build / docker / CI) into the comparison across all three variants.

> The remaining manual metrics (error reproduction steps, docs pages, files touched for the Risk
> trend AI task) are recorded here during the measurement pass, once Friction and Overfit also exist.
