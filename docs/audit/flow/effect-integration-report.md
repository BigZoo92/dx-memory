# Flow — Effect TS integration report

_Variant B (Flow). Scope: `packages/flow/**` + `apps/flow-app`. Goal: introduce Effect TS only where
it reduces the cost of delivery — strong at the data edges, light/none in pure logic and the view._

## TL;DR

Effect was added to the two layers where it pays: `server-data-access` (services, layers, typed
errors, runtime validation) and `api-client` (typed request orchestration: retry, timeout,
AbortSignal). A new tiny isomorphic package `@signalops/flow-effect` owns the shared error channel
and the one `ApiError` mapping. `domain` and `ui` stay Effect-free on purpose.

Cost: **+9.17 KiB gzip** total in the analyzer report (entry +3.0, router +6.18), concentrated in
the client; `/signals`' `@tanstack/table-core` stays lazy and unchanged. No `server-data-access`, no
`fixtures`, no `@effect/platform-node`, and no Effect `Schema` reach the browser bundle.

Verdict: this strengthens Flow without tipping it into Overfit. See [Decision](#19-decision).

---

## 1. Official docs consulted

Pinned against the current stable line (`effect@3.21.4`, verified on the npm registry; the optional
`@effect/platform@0.96.2` declares peer `effect@^3.21.4`).

| Topic                                                           | URL                                                            |
| --------------------------------------------------------------- | -------------------------------------------------------------- |
| Yieldable / `Data.TaggedError`                                  | https://effect.website/docs/error-management/yieldable-errors/ |
| Services (`Context.Tag`)                                        | https://effect.website/docs/requirements-management/services/  |
| Layers (`Layer.effect/sync/succeed`, `provide`, `merge`)        | https://effect.website/docs/requirements-management/layers/    |
| Schema — getting started (`effect/Schema`)                      | https://effect.website/docs/schema/getting-started/            |
| Schema — error formatters (`ParseResult.ArrayFormatter`)        | https://effect.website/docs/schema/error-formatters/           |
| Retrying (`Effect.retry`, `Schedule`)                           | https://effect.website/docs/error-management/retrying/         |
| Timing out (`Effect.timeout` / `timeoutFail`)                   | https://effect.website/docs/error-management/timing-out/       |
| Running effects (`runPromise`/`runPromiseExit` + `AbortSignal`) | https://effect.website/docs/getting-started/running-effects/   |
| Registry — `effect` latest                                      | https://registry.npmjs.org/effect/latest                       |
| Registry — `@effect/platform` peer range                        | https://registry.npmjs.org/@effect/platform/latest             |

Confirmed current/stable APIs used: `Schema` lives in `effect/Schema` (single import path, no separate
`@effect/schema` package); `Effect.runPromiseExit(effect, { signal })` accepts an AbortSignal;
`Effect.timeoutFail` maps a timeout to a custom error; `Schedule.intersect`/`exponential`/`recurs`
compose retry policies; `ParseResult.ArrayFormatter.formatErrorSync` renders structured issues.

## 2. Packages installed

| Package  | Version                           | Where                                                                                        | Why                                                                                                                 |
| -------- | --------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `effect` | `3.21.4` (pinned in pnpm catalog) | `flow-effect`, `flow-server-data-access`, `flow-api-client`, `flow-app` (devDep, tests only) | core: `Effect`, `Context`, `Layer`, `Schedule`, `Duration`, `Schema`, `Cause`, `Exit`, `Option`, `Data.TaggedError` |

Deliberately **not** installed:

- `@effect/platform` / `@effect/platform-browser` — `HttpClient`/`FetchHttpClient` would add bundle
  weight on the client for no functional gain over a thin `fetch`-in-Effect wrapper. Evaluated and
  refused (see [§18](#18-where-effect-was-deliberately-refused)).
- `@effect/platform-node` — server-only HTTP/file primitives not needed; would risk leaking
  Node-only code toward the client. Not installed.

Version is pinned in `pnpm-workspace.yaml` under `catalog:` (no floating `latest`); every consumer
references `"effect": "catalog:"`.

## 3. New package — `@signalops/flow-effect`

Created at `packages/flow/effect`. Tiny and **isomorphic** (runs identically on server and client).
Dependencies: `@signalops/contracts` + `effect` only.

| File            | Responsibility                                                                   |
| --------------- | -------------------------------------------------------------------------------- |
| `errors.ts`     | the typed `Flow*Error` channel + the `FlowError` union                           |
| `request-id.ts` | `makeRequestId()` (isomorphic `crypto.randomUUID`)                               |
| `api-error.ts`  | `toApiErrorPayload(error)` — the single error → `ApiError` envelope + status map |

It is imported by **both** `server-data-access` and `api-client`, which is exactly why it must stay
framework-free: see the boundary rules in [§12](#12-boundaries).

## 4. Where Effect was integrated

### server-data-access (strong fit)

- **Services** as `Context.Tag` classes: `Dataset`, `SignalsRepository`, `IncidentsRepository`,
  `DashboardService`, `CompareService`, `MetricsService`, `HealthService`, plus a request-scoped
  `RequestContext`.
- **Layers**: each service has a `*Live` layer; `ServerLive` composes them over `DatasetLive`
  (`Layer.provide`), so it requires nothing and provides everything. `makeServerTestLayer({...})` /
  `makeDatasetLayer({...})` are the test seams.
- **Typed errors**: repositories/services fail with `FlowNotFoundError` / `FlowValidationError`
  carrying the `requestId` from `RequestContext` — no requestId is threaded by hand.
- **Runtime validation**: `query/parse.ts` now uses **Effect Schema** (`Schema.Struct` +
  `NumberFromString` + `Literal`) and maps a `ParseError` to `FlowValidationError` with the full
  issue list as `details`.
- **Boundary**: `runApiEffect(effect)` provides `ServerLive` + a fresh `RequestContext`, runs to an
  `Exit`, and maps any typed failure (or unexpected defect) to `{ status, body: ApiError }`.
- Pure compute (filter/sort/paginate, KPI math, compare diff) stays as **plain functions** called
  inside the services — Effect wraps IO/DI/errors, not arithmetic.

### apps/flow-app (boundary only)

- `src/server/respond.ts` exposes one helper, `handleEffect(effect)`, that runs an effect through
  `runApiEffect` and turns the result into a JSON `Response`. HTTP transport stays in the app;
  business logic + error mapping stay in the data layer.
- Every `GET /api/*` route is now `handleEffect(getXEffect(...))`. `POST /api/simulate-error` is
  unchanged (a deliberately imperative endpoint).
- `__root.tsx` QueryClient retry is set to `false` (responsibility split — see
  [§10](#10-retry-responsibility)).

### api-client (acceptable fit)

- `requestEffect<A>(path, options)` orchestrates demo-controls → fetch → parse, then a bounded
  network retry (`Schedule.intersect(exponential, recurs)`) and a total `timeoutFail`.
- `apiGet`/`apiPost` keep their **public signatures** and still reject with the same
  `ApiRequestError` the UI already reads (`error.apiError.message` / `.requestId`) — zero UI change.
- The TanStack Query `AbortSignal` is threaded to both `fetch` and `Effect.runPromiseExit(_, { signal })`.

## 5. Where Effect was refused

`domain` and `ui` (and the React components in `feature-*`). Full rationale in
[§18](#18-where-effect-was-deliberately-refused).

## 6. Typed errors created (`flow-effect`)

`FlowValidationError` (→400), `FlowNotFoundError` (→404), `FlowApiError` (passthrough status),
`FlowNetworkError` (→502), `FlowTimeoutError` (→504), `FlowUnexpectedError` (→500). All carry
`requestId`; the closed `FlowError` union makes `toApiErrorPayload` exhaustive (a new variant is a
compile error until mapped).

## 7. Layers / services created

`Dataset` (+ `DatasetLive`, `makeDatasetLayer`), `RequestContext`, `SignalsRepository`,
`IncidentsRepository`, `DashboardService`, `CompareService`, `MetricsService`, `HealthService`, all
with `*Live` layers; `ServerLive` (composition) and `makeServerTestLayer` (test composition).

## 8. Validation: Zod → Effect Schema (server frontier only)

- **Replaced**: server-side `/api/signals` & `/api/incidents` query parsing now uses Effect Schema.
  `zod` was removed from `flow-server-data-access` dependencies.
- **Kept (intentionally)**: TanStack Router's `validateSearch` in `apps/flow-app/src/routes/*`
  stays on Zod — it is the router's documented integration and is simpler there. So each frontier
  has exactly one validator: **router/URL = Zod**, **API runtime = Effect Schema**. The two never
  overlap on the same boundary.

## 9. API routes refactored

`/api/signals`, `/api/signals/$id`, `/api/signals/$id/events`, `/api/incidents`,
`/api/dashboard/summary`, `/api/compare/$id`, `/api/dx-metrics`, `/api/health` → all use
`handleEffect`. Response shapes, status codes and `requestId` are preserved; no route paths changed.

## 10. Retry responsibility

Effect owns **transient-network** retry (network failures only, bounded backoff `100ms → 200ms`,
max 2 retries) and the **timeout** (10s total). TanStack Query retry is now `false`, so there is no
double-retry and deterministic API errors (4xx/5xx envelopes, forced-error demo) surface
immediately. Cache/server-state stays TanStack Query's job.

## 11. API client refactored

`fetch` wrapped in Effect; typed `FlowNetworkError`/`FlowApiError`/`FlowTimeoutError`; bounded retry

- timeout; AbortSignal threaded; `ApiError` envelope parsing reuses the same `toApiErrorPayload` as
  the server. `@effect/platform` HttpClient was evaluated and refused for bundle reasons.

## 12. Boundaries

`.dependency-cruiser.cjs` gained: `flow-effect` may import only `contracts` + `effect`
(`no-flow-effect-to-framework`, `no-flow-effect-to-siblings`); `ui` may import neither the Effect
runtime nor `flow-effect` (`no-ui-to-effect-runtime`, `no-ui-to-flow-effect`). `flow-effect/src` was
added to the `audit:flow:cycles` (madge) target. `pnpm audit:flow:boundaries` → **0 violations**
(376 modules); `pnpm audit:flow:cycles` → **no circular dependency**.

## 13. Bundle: before / after

Measured with the existing `rollup-plugin-visualizer` (`pnpm analyze:flow`). The report captures the
SSR/server build pass (chunk names `server.js`, `src-*`, `router-*`), so the same methodology
applies to both snapshots: `bundle-stats.before-effect.md` (pre-Effect Flow v2) vs
`bundle-stats.after.md` (with Effect).

| Metric (total) |         Before |          After |                     Δ |
| -------------- | -------------: | -------------: | --------------------: |
| Rendered       |     486.61 KiB |     510.63 KiB |        **+24.02 KiB** |
| **Gzip**       | **152.88 KiB** | **162.05 KiB** | **+9.17 KiB (+6.0%)** |
| Brotli         |     131.23 KiB |     138.76 KiB |             +7.53 KiB |
| Modules        |            216 |            226 |                   +10 |

Per chunk (gzip):

| Chunk                                  | Before | After |     Δ | Note                                  |
| -------------------------------------- | -----: | ----: | ----: | ------------------------------------- |
| `server.js` (SSR handler, not shipped) |  50.93 | 50.93 |     0 | unchanged                             |
| `signals-*` (`/signals`, lazy)         |  34.57 | 34.56 |    ~0 | **`@tanstack/table-core` stays lazy** |
| `src-*` (entry)                        |  25.75 | 28.75 | +3.00 | Effect core lands here                |
| `router-*`                             |  18.29 | 24.47 | +6.18 | route + api-client → Effect           |

Browser bundle (`apps/flow-app/dist/client`, measured directly): **209.4 KiB gzip** total after
integration, entry chunk ~177.6 KiB gzip.

A clean before/after of `dist/client` alone is not available because the whole Flow v2 restructure is
uncommitted relative to `HEAD` (so a `git stash` build measures the older reference Flow, not
"Flow v2 minus Effect"). The analyzer delta above uses identical methodology on both snapshots and is
the reliable comparison; it is dominated by client chunks (entry + router), so the client Effect cost
is **~+9 KiB gzip**, bounded and verified by the module-level checks below.

## 14. Top new modules in the bundle

The growth is the Effect **core runtime** used by `api-client` (`Effect`, `Schedule`, `Duration`,
`Cause`, `Exit`, `Option`) plus `flow-effect`'s small tagged-error classes, landing in the entry and
`router` chunks. Effect tree-shakes well: only ~+9 KiB gzip for the parts actually used (the full
library is far larger). Verified by inspecting `dist/client`:

- ✅ no `server-data-access` in the client (`SignalsRepositoryLive`/`buildDashboardSummary` absent)
- ✅ no `fixtures` in the client (`generateAll` absent)
- ✅ no `@effect/platform-node` in the client
- ✅ Effect **Schema** does not ship to the client (one incidental `ParseError` string reference, not
  the module) — runtime validation is server-only
- ✅ `@tanstack/table-core` remains route-lazy on `/signals` (unchanged size)

## 15. Docker

`pnpm nx run flow-app:docker-build --skip-nx-cache` → **success** (`signalops-flow:local`). The
multi-stage build runs `pnpm install --frozen-lockfile`; the lockfile was synced so the catalog
`effect` entry resolves offline.

## 16. CI

No CI shape change. `flow-ci.yml` already runs lint → typecheck → test → build → boundaries → cycles
→ metrics (+ docker on main); all still pass. New Effect tests use fake/short timers and bounded
retries, so they are fast (api-client suite ~0.5s) and add no flakiness.

## 17. Commands run

`pnpm install`, `pnpm fixtures:generate`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
`pnpm metrics:collect`, `pnpm audit:flow:boundaries`, `pnpm audit:flow:cycles`, `pnpm analyze:flow`,
`pnpm nx run flow-app:docker-build --skip-nx-cache`, plus the per-project `:typecheck` / `:test`
targets for `flow-effect`, `flow-domain`, `flow-server-data-access`, `flow-api-client`, `flow-app`.

> Note on `nx affected --base=HEAD~1 --head=HEAD`: not meaningful here — the entire Flow v2 structure
> and this Effect work are **uncommitted** relative to `HEAD` (an older reference Flow). The full
> `nx run-many -t lint typecheck test build` (a superset of affected) was run instead and passed for
> all 18 projects.

## 18. Where Effect was deliberately refused

- **`domain`** — kept pure and dependency-free (`contracts` only). Its functions are total
  (`normalizeConfidence` never throws; `NormalizedConfidence` is already as expressive as `Option`
  here). Adding `effect/Option` to a package imported by every client feature would pull the Effect
  runtime toward the eager client bundle for no correctness gain. The `flow-effect-services` skill is
  explicit: "do not let Effect leak as a hard requirement of pure functions/types." Refused.
- **`ui`** — receives plain data and plain errors via props. `QueryState` still duck-types the
  `ApiRequestError` envelope; no Effect in components. Enforced by `no-ui-to-effect-runtime` /
  `no-ui-to-flow-effect`.
- **React components / click handlers / badges / cards / CSS modules** — untouched.
- **`@effect/platform` `HttpClient` on the client** — refused; a thin `fetch`-in-Effect wrapper gives
  the same typed retry/timeout/abort with less weight, and avoids any risk of Node-only platform code
  near the browser bundle.
- **Wrapping pure compute in `Effect`** — refused; `querySignals`, `queryIncidents`,
  `buildDashboardSummary`, the compare diff and KPI math stay plain functions.

## 19. Decision

**Keep.** Effect is concentrated where it lowers the cost of change — typed, correlated errors; a
single exhaustive error→`ApiError` map; injectable services with a trivial test seam
(`makeServerTestLayer`); declarative retry/timeout/cancellation at the client edge; one runtime
validator per frontier. It is kept out of pure logic and the view, and the measured client cost
(~+9 KiB gzip, table-core still lazy, no server/fixtures/Schema/platform leakage) is modest and
defensible. This enriches Flow; it does not turn it into Overfit.
