# ADR 0004 - Full OTel-Like Observability, Memory-Only

Status: Accepted

## Context

Production-grade observability - distributed tracing, metrics, structured logs, correlation ids, diagnostic bundles - is a genuine best practice for systems that run at scale and need to be debugged in production. Overfit is a demo that serves a read-only dataset from memory. Instrumenting it as if it were a production distributed system is a deliberate over-investment used to demonstrate the cost.

## Decision

- Build a memory-only, OTel-like collector in `overfit-observability`: request ids, spans and traces, metric counters and gauges, structured logs, breadcrumbs, and a diagnostic pack.
- Instrument the full per-request pipeline so that every request - including a GET on the public dataset - opens a trace span, records an audit event, checks policy, and exports telemetry.
- Expose it through technical endpoints (Overfit-only, not part of the visible product): `GET /api/telemetry/traces`, `GET /api/telemetry/metrics`, `GET /api/audit-events`, `GET /api/diagnostic-pack`, `GET /api/health/deep`, `GET /api/health/dependencies`. Surface it in the `/ops` page.
- Keep everything in bounded in-memory buffers. No external collector, no secrets, no persistence.

## Consequences

Positive:

- A correlation id threads the entire pipeline, so the debugging demo can follow one request from ingress to response (see `runbooks/debugging.md`).
- Rich `/ops` page and an exportable diagnostic pack, useful for the thesis demonstration.

Negative (the point):

- Every read pays for tracing, auditing, and telemetry export it does not need. The observability path is a large fraction of the per-request work for a static dataset.
- More endpoints, more spans to keep correct, more tests, and more surface for a product change to ripple into (the observability policy requires a fixed 7-span pipeline; see `policies/observability-policy.md`).

Flow keeps observability proportionate to a demo and pays almost none of this cost. This ADR records the full observability stack as intentional, so its weight is measured rather than mistaken for a requirement.
