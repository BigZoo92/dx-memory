# Flow - run/observability bundle report

Measured with `pnpm analyze:flow` (rolldown-vite production build). Reminder: `bundle-stats.*` measures
the SSR pass; the real client bundle is `apps/flow-app/dist/client`.

## Client bundle (after this pass)

| Chunk | Raw | Gzip | Notes |
| --- | --- | --- | --- |
| `index-*.js` (main) | ~600 kB | ~187 kB | React + TanStack stack (pre-existing; dominates the bundle) |
| `signals-*.js` | ~77 kB | ~21 kB | Table/Virtual - lazy, loads only on `/signals` |
| `ops-*.js` | ~5.6 kB | ~2.3 kB | `/ops` Operational health - lazy route chunk |
| `dx-metrics-*.js` | ~7.9 kB | ~2.9 kB | includes the Run readiness card |

The observability core added to the client (logger + bounded store + redact + breadcrumbs + global
handlers, imported by `api-client` and the app entry) is small and framework-free; the a11y primitives
and error boundary are a couple of KB and tree-shakeable.

## Guardrails (verified by grep over `dist/client`)

| Must NOT appear in the client bundle | Result |
| --- | --- |
| `server-data-access` | 0 files |
| `fixtures/data` (the dataset) | 0 files |
| `@effect/platform-node` | 0 files |
| `@signalops/flow-observability/effect` (`observabilityLoggerLayer`, `Logger.replace`) | 0 files |
| `/ops` in a lazy chunk (not eager) | ops-*.js is a separate chunk |
| Table/Virtual lazy on `/signals` | signals-*.js is a separate chunk |

The Effect logger adapter stays server-only because only `server-data-access` imports
`@signalops/flow-observability/effect`; `api-client` imports the framework-free core only.

## Budget

- Observability core in the client: target <= 4 KB gzip, ceiling 6 KB.
- `/ops` lazy chunk: target <= 25 KB gzip (currently ~2.3 KB).
- Effect adapter in client: 0 KB (server-only).
- No chart library, no Sentry SDK, no OpenTelemetry SDK in the client.

## How to re-check

```bash
pnpm analyze:flow
for n in server-data-access fixtures/data @effect/platform-node observabilityLoggerLayer; do
  echo "$n: $(grep -rl "$n" apps/flow-app/dist/client | wc -l)"
done
```
