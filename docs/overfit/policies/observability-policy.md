# Observability Policy

Overfit instruments the full per-request pipeline (ADR 0004). This policy defines what must be observed, at what log levels, what is redacted, and how long data is retained. Everything is memory-only.

## Required spans - the 7-span pipeline

Every request must produce a trace with the following ordered spans:

1. request-id - assigning and attaching the correlation id.
2. audit - recording the audit event for the access.
3. schema-validation - validating the transport DTO against the endpoint schema.
4. policy-check - evaluating route access / redaction / feature-flag policies.
5. command-or-query - dispatching to the command or query handler.
6. read-model - projecting to the read model that answers the request.
7. response-map-and-export - mapping to the response DTO and exporting telemetry.

This 7-span shape is required even for a GET on the public dataset. A change that adds or removes a pipeline stage must update this list and the span assertions in the tests.

## Log levels

- ERROR - a request failed or a SimulatedFault fired.
- WARN - a policy denied access or a validation was rejected.
- INFO - normal request lifecycle (one entry per request, carrying the correlation id).
- DEBUG - per-span detail, off by default in normal runs.

Every log entry carries the correlation id so it joins the trace and audit event.

## Redaction

- The audit trail applies field redaction before storage (`overfit-audit`), governed by the redaction policy in `overfit-policies`.
- No secrets are ever collected. There are no credentials in this system, and none may be added to logs, traces, breadcrumbs, or the diagnostic pack.
- Redaction is applied before the diagnostic pack is assembled, so exports are safe to share.

## Retention

- All buffers are bounded in memory (logs, traces, metrics, breadcrumbs, audit). They are rolling windows, not full history.
- There is no persistence and no external collector. Restarting the API clears observability state; the event store reseeds deterministically.

## Consequence

The policy is strict and complete, which is good practice - and disproportionate for a read-only demo. The fixed 7-span requirement means observability is one more surface a product change must keep correct, contributing to Overfit's high cost of change.
