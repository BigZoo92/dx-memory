# Architecture Overview

Overfit implements the SignalOps product with a layered, ports-and-adapters backend in Rust and an over-decomposed feature-package frontend in TypeScript. Everything below is individually sound. The point of this document is that the sum is deliberately excessive for a read-only demo dataset.

## Backend: 18 Cargo crates (17 libraries + 1 binary)

The Cargo workspace lives at the repo root. Layers, from domain outward:

- `overfit-domain` - enums, value objects (RiskScore, Confidence, SignalId), entities, aggregates (SignalAggregate, IncidentAggregate), domain events, validation.
- `overfit-events` - versioned EventEnvelope + EventMetadata (correlation/causation ids).
- `overfit-event-store` - in-memory append-only store, per-stream sequencing, replay; seeds ~20,300 events at boot.
- `overfit-contracts` - camelCase transport DTOs, ApiError, Paginated, SignalsQuery, and domain-to-DTO mappers.
- `overfit-read-models` - projectors: signals query/detail/timeline, incidents, dashboard, compare, dx-metrics.
- `overfit-repositories` - ports/traits plus a fake UnitOfWork transaction boundary.
- `overfit-adapters-fixtures` - deterministic mulberry32 generator (ported from the shared TS generator): 10,000 signals, 300 incidents, 25 analysts, 12 sources, 50,000 events.
- `overfit-commands` - Command enum, validation, SimulatedFault.
- `overfit-queries` - typed query handlers over the ports.
- `overfit-observability` - memory-only OTel-like collector: request ids, spans/traces, metrics, structured logs, breadcrumbs, diagnostic pack.
- `overfit-policies` - route_access/schema/redaction/ai/feature_flag policies plus the policy check.
- `overfit-schema-registry` - endpoint-to-schema registry, 20 entries.
- `overfit-audit` - in-memory audit trail with field redaction.
- `overfit-feature-flags` - internal platform flags, all enabled for parity.
- `overfit-application` - composition root; runs the per-request pipeline.
- `overfit-adapters-http` - Axum router, handlers, ApiError mapping.
- `overfit-test-support` - fixtures and booted-app helpers.
- `apps/overfit-api` - the binary.

## Frontend: 14 TypeScript packages

Under `packages/overfit/`: `contracts-generated` (DTOs + runtime validators, marked DO NOT EDIT), `api-client`, `ui`, `feature-dashboard`, `feature-signals`, `feature-signal-detail`, `feature-incidents`, `feature-compare`, `feature-dx-metrics`, `feature-settings`, `feature-ops`, `quality-gates`, `ai-governance`, `generated-manifests`. Each feature is a separate package with its own view-model mapper.

## The two too-heavy flows

Backend per request (runs even for a GET on a public, read-only dataset): HTTP request -> Axum route -> Tower middleware -> request id -> trace span -> audit event -> transport DTO -> schema validation -> policy check -> command/query -> handler -> aggregate -> domain event -> memory event store -> projector -> read model -> response mapper -> OpenAPI schema -> telemetry export.

Frontend per view: Next page -> feature package -> generated API client -> runtime validation -> ViewModel mapper -> UI package -> accessibility metadata -> telemetry client breadcrumb.

## Deliberately excessive

None of these steps is wrong. A GET on a static 10,000-row dataset does not need event sourcing, per-request audit, policy checks, and telemetry export. The architecture is here to be measured, not imitated. See `boundaries.md` and `polyglot-cost.md` for the concrete cost.
