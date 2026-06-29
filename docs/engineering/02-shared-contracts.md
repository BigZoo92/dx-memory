# 02 — Shared contracts (`@signalops/contracts`)

The single, binding source of truth for the shapes every variant shares. If a type changes here,
it changes for all three variants — that is the point.

## What's inside

| Module      | Exports                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------- |
| `signal`    | `Signal`, `SignalSeverity`, `SignalStatus`, `SignalSource`, `RiskTrend`, enum arrays, type guards |
| `incident`  | `Incident`, `IncidentStatus`, `IncidentImpact`, enum arrays, type guards                          |
| `timeline`  | `TimelineEvent`, `TimelineEventType`                                                              |
| `entities`  | `Analyst`, `Source` (the references signals/incidents point at)                                   |
| `dx-metric` | `DxMetric`, `VariantId`, `MetricAxis`, `METRIC_LOWER_IS_BETTER`                                   |
| `filters`   | `SignalsQuery`, `IncidentsQuery`, sort fields, page-size defaults                                 |
| `api`       | `ApiError`, `Paginated<T>`, response types, `API_ROUTES`                                          |

## Two intentional contract decisions

1. **`confidence: number \| null`.** The product contract allows confidence to be missing, which
   drives the "Confidence unavailable." UI state. Fixtures produce ~5% `null`.
2. **`riskTrend?` is reserved, not populated.** Adding and wiring `riskTrend` across the app is the
   shared **AI cost-of-change task** (`docs/product/03-ai-task-protocol.md`, scenario
   `validate-risk-trend-feature`). The field is optional in the type so the contract stays
   forward-compatible, but the socle fixtures leave it undefined so the change remains a genuine,
   measurable task.

## Usage

```ts
import {
  type Signal,
  type SignalsQuery,
  type ApiError,
  SIGNAL_SEVERITIES,
  isSignalSeverity,
  API_ROUTES,
  METRIC_LOWER_IS_BETTER
} from '@signalops/contracts'
```

The enum arrays (`SIGNAL_SEVERITIES`, …) and `METRIC_LOWER_IS_BETTER` are runtime values, so
fixtures, UI and metrics all derive from the same source — they can't drift from the types.
