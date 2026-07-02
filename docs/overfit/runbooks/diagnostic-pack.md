# Runbook - Diagnostic Pack

The diagnostic pack is a single snapshot that bundles the entire observability state of the running API. It is the recommended handoff artifact when reporting or reproducing an issue, because it captures everything the `/ops` page shows in one export.

## What it bundles

`GET /api/diagnostic-pack` collects, from the memory-only observability stack:

- Logs - the structured in-memory log buffer.
- Traces - spans for recent requests, keyed by correlation id.
- Metrics - counters and gauges (request counts, per-endpoint timings, error counts).
- Breadcrumbs - the ordered trail of steps for recent requests, including client breadcrumbs posted via `POST /api/logs`.
- Event-store counts - per-stream sequence counts and totals (seeded at ~20,300 events).
- Audit - the in-memory audit trail, with field redaction already applied.
- Schema registry - the 20 endpoint-to-schema entries and their versions.
- Feature flags - the internal platform flags (all enabled for parity).

## How to export

- From the UI: open `/ops` and use the diagnostic pack export control.
- From the API directly: `curl http://localhost:3200/api/diagnostic-pack > diagnostic-pack.json`.

## How to read it

1. Start from a request id. Find it in the `ApiError` or in the traces section.
2. Follow that id across sections: the trace shows the span timeline, the logs show structured messages, the audit trail shows what was accessed (redacted), and the breadcrumbs show the ordered pipeline steps.
3. Cross-check counts: event-store counts confirm the seed loaded correctly; metrics confirm the endpoint was hit and whether it errored.
4. Confirm environment: schema-registry versions and feature-flag state tell you the contract and configuration the request ran under.

## Bounds and safety

All buffers are bounded (see `policies/observability-policy.md`), so the pack is a rolling window, not a full history. Redaction is applied before export, and no secrets are collected. The pack is safe to attach to a bug report.

## Why it exists

Because every request runs the full pipeline, the observability data is unusually complete for a demo. The diagnostic pack turns that into one artifact so a reproduction takes fewer steps. That completeness is deliberate over-investment (ADR 0004); the pack is the useful by-product of it.
