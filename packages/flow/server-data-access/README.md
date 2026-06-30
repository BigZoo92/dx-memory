# @signalops/flow-server-data-access

Server-side data access for the Flow variant. **No UI** — no React, no components. Consumed by the
TanStack Start server routes in `flow-app`. Depends on [`@signalops/contracts`](../../contracts),
[`@signalops/fixtures`](../../fixtures), [`@signalops/flow-domain`](../domain) and
[`@signalops/flow-effect`](../effect) (+ `effect`).

The data edge is driven by **Effect**: repositories and services are injectable services
(`Context.Tag` + `Layer`), failures travel a typed error channel, and one boundary helper provides
the live layer + request context and maps any failure to the canonical `ApiError`. Pure compute
stays plain.

## What's inside

| Module          | Responsibility                                                                                                        |
| --------------- | --------------------------------------------------------------------------------------------------------------------- |
| `fixtures/`     | the dataset: in-process `generateAll()` (memoized), plus a JSON loader for parity                                     |
| `effect/`       | `Dataset` + `RequestContext` services, `ServerLive` layer wiring, `runApiEffect`, route-facing effects, error helpers |
| `repositories/` | `SignalsRepository` / `IncidentsRepository` (tag + `*Live` layer) + pure `querySignals` / `queryIncidents`            |
| `services/`     | dashboard / compare / metrics / health (tag + `*Live` layer) + pure builders                                          |
| `query/`        | **Effect Schema** parsing of `/api/signals` & `/api/incidents` params → `FlowValidationError`                         |
| `api-errors/`   | `ApiErrorException` + `simulatedError` — for the imperative `POST /api/simulate-error` only                           |
| `config.ts`     | server-side variant identity (mirrors the app's client config)                                                        |

## How a request flows

```ts
// route (apps/flow-app) — thin:
GET: ({ request }) => handleEffect(getSignalsEffect(new URL(request.url).searchParams))

// getSignalsEffect (here) — composes parse + repository:
Effect.gen(function* () {
  const query = yield* parseSignalsQuery(input) // FlowValidationError on bad input
  const repo = yield* SignalsRepository // injected service
  return yield* repo.query(query)
})

// runApiEffect (here) — the one boundary:
//  provide ServerLive + a fresh RequestContext -> run to an Exit ->
//  map FlowError | defect -> { status, body: ApiError }
```

## Design notes

- **Services + layers**: `Dataset`, `SignalsRepository`, `IncidentsRepository`, `DashboardService`,
  `CompareService`, `MetricsService`, `HealthService`, `RequestContext`. `ServerLive` composes the
  `*Live` layers over `DatasetLive` and requires nothing.
- **Typed errors**: failures are `FlowNotFoundError` / `FlowValidationError` (from
  `@signalops/flow-effect`) carrying the `requestId` read from `RequestContext` — never threaded by
  hand. `runApiEffect` maps them to `ApiError`; an unexpected defect becomes an opaque 500.
- **Effect only at the edges**: filtering, sorting, pagination, KPI math and the compare diff stay
  **plain functions** called inside the services. Effect wraps IO, DI and the error channel — not
  arithmetic.
- **Validation**: Effect Schema is the runtime source of truth for the API query frontier (Zod was
  removed here; the router keeps Zod for `validateSearch`).
- **Testing**: `makeServerTestLayer({ signals: [...] })` / `makeDatasetLayer({...})` swap the data
  source so a service test runs the real repository against hand-built rows.

```bash
pnpm nx run flow-server-data-access:test       # vitest
pnpm nx run flow-server-data-access:typecheck   # tsc -b (references contracts, fixtures, domain, effect)
```

Tests cover `/signals` filtering, **stable** pagination & sort, typed not-found (`_tag` + mapping to
`ApiError`), `requestId` propagation, `confidence: null` preservation, Effect-Schema validation
errors, and layer wiring against a mock dataset.
