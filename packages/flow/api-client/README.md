# @signalops/flow-api-client

> Browser API client + TanStack Query hooks (client-only). Part of the **Flow** variant (`packages/flow/*`).

The Flow variant's browser-side data surface: a typed `fetch` wrapper
(`apiGet` / `apiPost` / `ApiRequestError` / `toQueryString`) and the TanStack Query hooks every
feature uses to read `/api/*`. Also hosts the **client-side demo controls** (slow network / forced
error) that the Settings screen drives — toggling them actually delays or fails requests.

**Boundary:** depends on `@signalops/contracts`, `@signalops/flow-effect`, `effect` and TanStack
Query. It never imports `@signalops/flow-server-data-access` or `@signalops/fixtures` — only HTTP
crosses the wire.

## Effect-orchestrated requests

`apiGet` / `apiPost` keep their public signatures and still reject with `ApiRequestError` (the UI
reads `error.apiError.message` / `.requestId`) — Effect is an internal implementation detail:

- `requestEffect<A>(path, options)` runs demo-controls -> `fetch` -> parse, then a **bounded
  network retry** (`Schedule.intersect(exponential('100 millis'), recurs(2))`, network failures
  only) and a **total timeout** (`Effect.timeoutFail`, 10s).
- Typed failures (`FlowNetworkError` / `FlowApiError` / `FlowTimeoutError`) are mapped to
  `ApiRequestError` via the same `toApiErrorPayload` the server uses, so client and API envelopes
  stay byte-consistent.
- The TanStack Query `AbortSignal` is threaded to both `fetch` and
  `Effect.runPromiseExit(_, { signal })`, so cancelling a query interrupts the fiber and the
  in-flight request.

**Retry split:** Effect owns transient-network retry; TanStack Query retry is `false` (set in
`__root.tsx`). No double-retry; deterministic API errors surface immediately.

## Commands

```bash
pnpm nx run flow-api-client:typecheck
pnpm nx run flow-api-client:test
pnpm nx run flow-api-client:lint
pnpm nx run flow-api-client:build
```

See [`docs/flow/architecture.md`](../../../docs/flow/architecture.md) for the
package's place in the dependency graph and the boundaries enforced around it.
