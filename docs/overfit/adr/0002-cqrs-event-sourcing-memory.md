# ADR 0002 - CQRS + Event Sourcing over an In-Memory Dataset

Status: Accepted

## Context

The SignalOps product is, at the data layer, a read-only demo dataset: 10,000 signals, 300 incidents, generated deterministically at boot. It is served server-paginated. There is no user write path in production behavior; the only mutation is `POST /api/simulate-error`, a fault injection for the debugging demo.

CQRS (Command Query Responsibility Segregation) with event sourcing is a heavyweight pattern intended for systems with complex write models, audit requirements, and evolving read projections. Applying it here is a textbook over-investment. Overfit does exactly that, on purpose.

## Decision

- Model the domain with aggregates (`SignalAggregate`, `IncidentAggregate`) that emit domain events.
- Persist those events in an append-only in-memory event store (`overfit-event-store`) with per-stream sequencing and replay. Seed ~20,300 events at boot.
- Separate write concerns (`overfit-commands`, a Command enum with validation and SimulatedFault) from read concerns (`overfit-queries`, `overfit-read-models` projectors for signals query/detail/timeline, incidents, dashboard, compare, dx-metrics).
- Wrap the fixtures generator to produce the event stream and let projectors build the read models the API serves.

## Consequences

Positive:

- Clean separation of reads and writes; projections are testable in isolation; the timeline endpoint (`/api/signals/:id/events`) falls out naturally from the event stream.
- The event store gives a realistic substrate for the observability and audit demos.

Negative (the point):

- Enormous machinery for a dataset that never really changes. A GET on the public dataset still traverses command/query handlers, aggregates, the event store, and a projector.
- Every product field must be threaded through the aggregate, the domain event, the projector, and the read model - multiplying the change surface (see `change-management/risk-trend-change-surface.md`).
- Higher cognitive load and more tests for zero product benefit over a plain read-through.

Flow serves the same product from a simple read model without event sourcing, and pays a fraction of the change cost. This ADR records event sourcing as a deliberate over-investment used to measure that gap.
