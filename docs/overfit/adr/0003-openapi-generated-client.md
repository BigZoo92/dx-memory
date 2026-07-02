# ADR 0003 - Maintained OpenAPI + Generated-Like TS Client + Drift Check

Status: Accepted

## Context

The Rust backend and the TypeScript frontend need a single source of truth for the API contract. The idiomatic Rust approach is to auto-generate OpenAPI from the handlers with `utoipa` (and serve it via `utoipa-swagger-ui`). That couples the OpenAPI output to specific `axum` / `utoipa` / `utoipa-swagger-ui` versions, which historically lock-step and can block an `axum` upgrade until the utoipa ecosystem catches up.

## Decision

- Treat `generated/overfit/openapi.json` as a MAINTAINED document, hand-authored and reviewed, not auto-generated from the Rust handlers. Utoipa auto-generation is deferred to avoid the axum/utoipa-swagger-ui version-lock risk.
- Generate the TS side from that document: `pnpm overfit:contracts:generate` produces the DTOs and runtime validators in `packages/overfit/contracts-generated` (marked DO NOT EDIT) and writes `generated/overfit/contracts.lock.json`, a hash of the schema plus operations.
- Enforce agreement with a drift gate: `pnpm overfit:contracts:check` fails when the generated contract no longer matches the OpenAPI document.

## Consequences

Positive:

- One reviewable contract, decoupled from the Rust web-framework version treadmill. Axum can be upgraded without waiting on utoipa.
- The frontend gets typed DTOs and runtime validators for free from that contract, and the drift gate catches divergence in CI.

Negative (the trade-off):

- The OpenAPI document is maintained by hand, so it can drift from the actual Rust handlers if a reviewer misses a change. The contract is only as correct as the discipline around editing it.
- A product field must now be written into the Rust types AND into the OpenAPI document AND regenerated into TS - a third representation and an extra gate.
- The "generated-like" client is generated from a maintained file, not from live code, so it inherits the maintained file's accuracy rather than the server's.

This is the classic decoupling-versus-drift trade-off. Overfit accepts the maintenance burden to avoid version lock, and records it here so the manual step is visible rather than surprising. See `policies/schema-policy.md` and `quality-gates/quality-gates.md`.
