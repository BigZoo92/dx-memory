# Boundaries

Overfit enforces strict architectural boundaries on both sides of the stack. This is a legitimate practice; at Overfit's scale it is one of the main sources of change cost, because every boundary is a place where a single product change must be re-typed and re-validated.

## Backend: ports and adapters

The Rust workspace follows a ports-and-adapters (hexagonal) layout:

- `overfit-domain` depends on nothing outside itself. Aggregates and value objects live here.
- `overfit-repositories` defines ports (traits) and a fake UnitOfWork transaction boundary. It does not know about HTTP or the event store implementation.
- Adapters (`overfit-adapters-http`, `overfit-adapters-fixtures`, `overfit-event-store`) implement the ports.
- `overfit-application` is the composition root. It wires ports to adapters and runs the per-request pipeline.

The rule: inner layers never import outer layers. HTTP types never leak into the domain; domain types cross the boundary only through `overfit-contracts` mappers.

## Frontend: package boundaries

Enforced by `dependency-cruiser.overfit.cjs` (run via `pnpm overfit:boundaries`, strict). Core rules:

- No imports from any Flow package. Overfit and Flow never depend on each other.
- Feature packages are islands: a feature package (for example `feature-signals`) must not import another feature package. Shared code goes through `ui`, `api-client`, or `contracts-generated`.
- `ui` is presentation-only: it must not import `api-client` or any feature package. It receives data as props.
- `api-client` may only depend on `contracts-generated`. It does not import features or UI.
- `contracts-generated` is generated and marked DO NOT EDIT; nothing writes to it by hand.

## Nx tags

Packages carry Nx tags used to enforce the same intent at the workspace level:

- `scope:overfit` on every Overfit package - blocks cross-scope imports (no `scope:flow`).
- `type:feature`, `type:ui`, `type:client`, `type:contracts`, `type:generated`, `type:governance` - encode the package role.
- `layer:presentation`, `layer:application`, `layer:contracts` - encode the allowed dependency direction (presentation -> application -> contracts, never the reverse).

## Why this raises change cost

Each boundary is a translation point. Adding one field to the product means crossing the domain-to-contract boundary in Rust, the OpenAPI boundary, the generated-contract boundary in TS, the api-client boundary, and the feature-to-ui boundary - each with its own type and its own validation. The boundaries are correct. There are simply too many of them for the size of the product. See `polyglot-cost.md` and `change-management/risk-trend-change-surface.md`.
