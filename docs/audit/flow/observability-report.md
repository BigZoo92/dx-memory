# Flow - observability report

Local-first, memory-only observability for Flow. No Sentry SDK, no OpenTelemetry SDK, no persistence,
no network. The model borrows OpenTelemetry's log data model (severity numbers) and Sentry's
breadcrumb/redaction ideas, implemented as a tiny framework-free runtime.

## Package: `@signalops/flow-observability`

`packages/flow/observability` - core (framework-free) + an isolated Effect adapter under `./effect`.

| Module | Responsibility |
| --- | --- |
| `types.ts` | `FlowLogEvent`, `FlowBreadcrumb`, `FlowAlert`, `RunCounters`, `DiagnosticPack` |
| `severity.ts` | level <-> OTel SeverityNumber (DEBUG 5, INFO 9, WARN 13, ERROR 17, FATAL 21) |
| `redact.ts` | the safety floor - strip credential keys, mask bearer/JWT/long tokens, truncate, bound depth |
| `memory-store.ts` | bounded ring buffer (100) + snapshot + subscribe (drives React via useSyncExternalStore) |
| `breadcrumbs.ts` | bounded trail (50) |
| `logger.ts` | `createLogger` - redacts then stores (+ optional console) |
| `alerts.ts` | window-based rules, pure, event-driven, dedup by deterministic id |
| `run-counters.ts` | derive handled/unhandled/timeouts/retries/coverage/alertCount |
| `diagnostic-pack.ts` | assemble a redacted, capped (last 20) JSON pack |
| `effect.ts` (`/effect`) | Effect `Logger` adapter (`observabilityLoggerLayer`) - server-only, never in the client bundle |

Boundaries (dependency-cruiser): observability imports only `contracts` (+ `effect` ONLY in
`effect.ts`). It must not import React, TanStack, ui, features, server-data-access, api-client,
fixtures or the app. UI must not import observability. Verified green (446 modules, 0 violations).

## Event model

Required: `id, timestamp, level, runtime, variant, message`. Optional: `severityNumber, requestId,
route, method, status, errorTag, errorCode, durationMs, retryCount, userAction, breadcrumbs,
safeContext`. Forbidden / always redacted: Authorization, cookies, tokens, prompts, PII, full stacks
(server-only, never client-exposed), fixture dumps.

## Request id correlation (X-Request-Id)

`makeRequestId()` -> `req_<uuid>`. The client sends `X-Request-Id`; the server `resolveRequestId`
reuses it only if well-formed, else mints a fresh one (never trusts a raw header), echoes it on the
response `X-Request-Id` header, and includes it in the `ApiError` body. One id ties the UI error, the
envelope, the header, and the client + server logs.

## Where logging happens

- Server: `server-data-access/src/effect/run.ts` logs success and typed failure (route, method, status,
  durationMs) - never a leaked stack. The Effect logger layer is also provided so `Effect.log*` flows in.
- Client: `api-client/src/client.ts` logs retries, timeouts and API errors + drops breadcrumbs.
- Global: `apps/flow-app/src/app/observability-client.ts` captures `window.onerror` and
  `unhandledrejection`.
- Demo: `routes/api/simulate-error.ts` logs the forced demo error.

## Alert rules

3x 500 in 60s -> critical; 3x timeout in 60s -> warning; 5x validation in 120s -> warning; any
`/signals` failure -> product-impact; any unhandled client error -> critical; forced demo error ->
demo-only. Evaluated event-driven (no timers), deduped by rule id, surfaced in `/ops` (aria-live).

## Surfaces

- `/ops` (`@signalops/flow-feature-ops`) - error inbox (grouped, copy request id), alerts, run health,
  breadcrumb timeline, download diagnostic pack, clear demo logs. Fuses the client store + the server
  store (`GET /api/logs`).
- `/api/logs` - memory-only. GET returns the server store; POST ingests a bounded (50) batch and
  re-redacts at the boundary.
- `/dx-metrics` Run readiness - live counters + seed MTTD/MTTR.

## Tests

19 unit tests in observability (redaction, severity, store bounds, alerts, counters, pack, logger,
Effect adapter) + request-id tests in flow-effect + grouping tests in feature-ops. All green.

## Limits

- Memory-only and bounded - logs age out; not a durable store (by design, demo).
- The Effect logger layer is wired but the guaranteed server logs come from explicit calls in `run.ts`.
