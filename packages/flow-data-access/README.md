# @signalops/flow-data-access

Server-side data access for the Flow variant. Depends on
[`@signalops/contracts`](../contracts), [`@signalops/fixtures`](../fixtures) and
[`@signalops/flow-domain`](../flow-domain). **No UI** — no React, no components. Consumed by the
TanStack Start server routes in `flow-app`.

## What's inside

| Module          | Responsibility                                                                       |
| --------------- | ------------------------------------------------------------------------------------ |
| `fixtures/`     | the dataset: in-process `generateAll()` (memoized), plus a JSON loader for parity    |
| `repositories/` | signals (filter → stable sort → paginate, detail, events) and incidents queries      |
| `services/`     | dashboard summary, compare response, dx-metrics (seed/collected), health, simulation |
| `query/`        | **Zod** parsing of `/api/signals` & `/api/incidents` query params → typed queries    |
| `api-errors/`   | `ApiErrorException` + factories → the canonical `ApiError` envelope with `requestId` |
| `config.ts`     | server-side variant identity (mirrors the app's client config)                       |

## Design notes

- The dataset is generated **in-process** from the shared deterministic generator — byte-identical
  to `pnpm fixtures:generate` output, but with no filesystem/bundle coupling for the server.
- Filtering and sorting are delegated to `@signalops/flow-domain`; only pagination lives here.
- Every failure path is a typed `ApiErrorException` carrying an HTTP status + `requestId`, so server
  routes serialize one consistent error shape.

```bash
pnpm --filter @signalops/flow-data-access test       # vitest
pnpm --filter @signalops/flow-data-access typecheck   # tsc -b (references flow-domain, contracts, fixtures)
```

Tests cover `/signals` filtering, **stable** pagination & sort, not-found (typed error),
`confidence: null` preservation and bad-request validation.
