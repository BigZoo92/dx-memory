# Flow - run readiness report

Flow can now detect, understand and repair an error before a user reports it - the "Run" axis of the
total delivery cost model.

## What "Run" looks like in Flow

- **Detect** - every server and client failure is logged (correlated by request id) into the in-memory
  store; global handlers catch `window.onerror` / `unhandledrejection`.
- **Alert** - window-based rules (spike of 500s, timeouts, validation, `/signals` impact, unhandled
  client error, forced demo) surface on `/ops` with an aria-live region.
- **Understand** - the `/ops` error inbox groups by signature with counts and a first/last window;
  copy the request id to correlate with the server log and the `X-Request-Id` header; breadcrumbs show
  the path to the error.
- **Repair** - download a redacted diagnostic pack to attach to a ticket; fix; clear demo logs.

## Run metrics in `/dx-metrics`

A "Run readiness" card shows:

- **Live** (from the observability store): handled errors, unhandled, timeouts, retries, requestId
  coverage, active alerts.
- **Seed** (clearly labelled, demo placeholders): MTTD, time to diagnose, MTTR. There is no historical
  incident data in the lab, so these are seed values, not measurements. Types live in
  `packages/flow/domain/src/run-readiness.ts`; counters come from `@signalops/flow-observability`.
  `packages/metrics` is intentionally untouched.

## Demo flow (soutenance)

1. Settings > Demo controls > Simulate API error (or slow network).
2. Watch `/ops` populate: inbox row, an alert, run-health counters move.
3. Copy the request id; show it in the server log + response header.
4. Download the diagnostic pack; show it is redacted (no secrets/cookies/tokens/stack/fixtures).
5. Stop the demo error; clear demo logs; the inbox returns to clean.

## Acceptance

- 10 error categories logged, correlated by request id (body + `X-Request-Id` header), displayed and
  tested.
- `/ops` fuses client + server stores; `/api/logs` is memory-only and bounded.
- Run section labelled live vs seed; no change to `packages/metrics`.

## Limits

- Memory-only: counters reflect the current session and age out (bounded ring buffer).
- MTTD/MTTR are seed values until real incident data exists.
