# Runbook - Debugging

Overfit's over-invested observability stack (ADR 0004) exists partly so this runbook can be short and precise. A single correlation id threads the entire per-request pipeline, so most debugging starts by finding that id and following it.

## Request ids and correlation

Every request gets a request id at the start of the pipeline. It is carried as a correlation id through the whole flow - middleware, trace span, audit event, command/query, event store, projector, response mapper, telemetry export - and propagated by the frontend api-client, which sets it on outbound requests and reads it back on responses.

To debug an issue:

1. Capture the request id. The api-client normalizes errors to `ApiError`, which carries the request id; the browser network tab and the response body both surface it.
2. Use that id to line up the trace, the audit event, and the logs for the same request.

## Reproduce a fault

`POST /api/simulate-error` triggers a `SimulatedFault` on the backend. Use it to produce a deterministic error and watch it flow through the pipeline into a trace, a log line, and an `ApiError` with a request id. This is the basis for the error-repro-steps metric.

## The /ops page

The `/ops` route (Operational health) is the human entry point. It surfaces:

- Deep and dependency health (`/api/health/deep`, `/api/health/dependencies`).
- Traces (`/api/telemetry/traces`) and metrics (`/api/telemetry/metrics`).
- Audit events (`/api/audit-events`).
- The diagnostic pack export.

Filter traces and audit events by the request id to isolate one request.

## Logs

- `GET /api/logs` returns the structured, in-memory log buffer.
- `POST /api/logs` appends a log entry (used by the client breadcrumb path).

Logs are structured and carry the correlation id, so they join up with traces and audit events for the same request.

## Diagnostic pack

When you need a single artifact to hand off, export the diagnostic pack from `/ops` (or `GET /api/diagnostic-pack`). It bundles logs, traces, metrics, breadcrumbs, event-store counts, audit trail, schema registry, and feature flags into one snapshot. See `runbooks/diagnostic-pack.md` for what is inside and how to read it.

## A note on the pipeline

Because the pipeline is deliberately heavy, a single GET produces a lot of telemetry. That is convenient for debugging but is itself part of the thesis: this much instrumentation is overkill for a read-only dataset. Keep the diagnostic pack as the primary handoff artifact rather than trawling every buffer by hand.
