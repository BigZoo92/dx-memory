# @signalops/flow-ui

Reusable React components for the Flow variant, styled with **CSS Modules** from the shared design
tokens ([`@signalops/ui-spec`](../ui-spec)). **Presentational only** — no API calls, no data
fetching, no fixtures. Components take data via props, so they stay testable and pixel-faithful.

Depends on [`@signalops/contracts`](../contracts) (types) and `@signalops/ui-spec` (tokens, hue maps)
only.

## Import the tokens once at the app root

```ts
import '@signalops/flow-ui/styles.css' // design tokens as CSS variables
```

## What's inside

| Group    | Components                                                                                                         |
| -------- | ------------------------------------------------------------------------------------------------------------------ |
| Badges   | `Badge`, `SeverityBadge`, `StatusBadge`, `ImpactBadge`, `IncidentStatusBadge`, `ConfidenceDisplay`, `VariantBadge` |
| Layout   | `AppShell`, `Sidebar`, `Header`, `Footer`, `Breadcrumb`                                                            |
| Data     | `KpiCard`, `MetricCard`, `StatTile`, `Card`, `SeverityBars`, `TrendChart`, `VariantBars`, `StatusList`, `Timeline` |
| Inputs   | `SearchInput`, `FilterSelect`, `Toggle`, `Checkbox`, `Button`                                                      |
| Feedback | `EmptyState`, `ErrorState`, `Banner` / `PartialError`, `Spinner`, `LoadingSkeleton`                                |
| Table    | `DataTableShell`, `BulkActionBar`, `RiskScoreCell`, `virtualRowStyle`, `tableStyles`                               |
| AI / cmp | `AiCard`, `RecommendedAction`, `ComparePanel` / `DiffRow` / `DeltaChip`, `UserImpact`, `MetricsTable`              |

## Notes

- **Router-agnostic**: `Sidebar`/`Breadcrumb` take a `renderLink` prop so the app supplies its
  TanStack Router `Link` — flow-ui never imports the router.
- **TanStack-free**: the table provides the chrome + a `virtualRowStyle` helper; the actual
  TanStack Table/Virtual wiring lives in `flow-app` (keeps this layer dependency-light).
- **Accessibility**: every badge carries a text label (never color alone); toggles use
  `role="switch"` + `aria-checked`; checkboxes have aria-labels; focus rings are visible.

```bash
pnpm --filter @signalops/flow-ui test       # vitest + React Testing Library (happy-dom)
pnpm --filter @signalops/flow-ui typecheck   # tsc -b (references contracts, ui-spec)
```

Tests cover the badges, `ConfidenceDisplay` with `null`, `EmptyState`/`ErrorState`/`PartialError`
and the compare panel.
