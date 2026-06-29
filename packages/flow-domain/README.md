# @signalops/flow-domain

Pure business logic for the Flow variant. **Framework-free**: no React, no DOM, no filesystem, no
TanStack — it depends only on [`@signalops/contracts`](../contracts), so it can be type-checked and
tested in isolation and reused by data-access and the app.

## What's inside

| Module       | Responsibility                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| `signals/`   | severity ranking, confidence normalization (incl. `null`), risk bands, combinable filters, stable sort |
| `dashboard/` | KPI values, severity breakdown, most-critical selection, 14-day time series                            |
| `incidents/` | status/impact formatting, incident summary (active, critical, avg resolution)                          |
| `compare/`   | before/after delta classification (severity / risk / confidence / assignment)                          |
| `metrics/`   | Build/Ship/Run/Change axis mapping + metric value formatting                                           |
| `format/`    | duration formatting                                                                                    |

## Why it's separate

Keeping ranking, filtering and KPI math here (not in components or the API) means the table, the
charts and the server compute them **identically** — and a rule change is one edit. The package has
no UI dependency, so it stays fast to test.

```bash
pnpm --filter @signalops/flow-domain test       # vitest
pnpm --filter @signalops/flow-domain typecheck   # tsc -b (composite, references contracts)
```

Tests cover severity sort, `confidence: null`, KPI computation, combinable filters and compare
deltas — the behaviors most likely to regress.
