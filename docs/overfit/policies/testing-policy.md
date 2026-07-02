# Testing Policy

Overfit tests both sides of the polyglot stack and every package boundary. The coverage is thorough and the surface is disproportionate - a single product change impacts about 72 tests. This policy states what must be tested and how it is run.

## Rust tests (cargo test)

Run with `pnpm overfit:api:test` (or `cargo test`). Required coverage:

- Domain: value objects (RiskScore, Confidence, SignalId) validation, aggregate behavior, domain-event emission.
- Contracts: domain-to-DTO mappers, ApiError shape, pagination.
- Event store: append-only sequencing, per-stream ordering, replay.
- Read models: each projector (signals query/detail/timeline, incidents, dashboard, compare, dx-metrics).
- Commands/queries: validation and handler behavior, including SimulatedFault.
- Adapters: HTTP handlers and ApiError mapping.
- Observability/policies/audit: the 7-span pipeline shape, policy decisions, redaction.

`overfit-test-support` provides fixtures and booted-app helpers so handler tests run against a real, seeded app.

## TypeScript tests (vitest, per package)

Run with `pnpm overfit:web:test`. Each package under `packages/overfit/` has its own tests:

- contracts-generated: runtime validators accept valid DTOs and reject invalid ones.
- api-client: request-id propagation, error normalization to ApiError, client-side validation.
- feature-*: view-model mappers and view logic (one suite per feature package).
- ui: accessible primitives (including the text-badge, never color-alone, rule).
- quality-gates / ai-governance / generated-manifests: gate logic and manifest validation.

## Quality gates

`pnpm overfit:quality` runs the contract, schema, docs, policy, and bundle-budget gates. `pnpm overfit:boundaries` runs dependency-cruiser (strict). These are lightweight, local checks (see `quality-gates/quality-gates.md`).

## Environment note

The JS/TS test suite and quality gates run fully without Rust. `cargo test` requires a Rust install (rustup); on a machine without cargo, the Rust suite cannot run and CI must use a runner that has the toolchain.

## The disproportionate surface

Because the same product concept is expressed in the Rust domain, the contracts, the read models, the generated TS contract, the api-client, and each feature package, one product change ripples into all of their tests. The "Risk trend" change impacts about 72 tests in Overfit versus about 9 in Flow. The tests are correct and valuable; there are simply far too many of them for the size of the product change. That gap is the thesis, not a defect.
