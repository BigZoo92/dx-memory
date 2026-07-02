# Schema Policy

Overfit keeps a formal schema contract between the Rust API and the TypeScript client, plus a runtime schema registry inside the API. This policy states how schemas are versioned, where the source of truth lives, and how drift is caught.

## Sources of truth

- The API contract is `generated/overfit/openapi.json`, a MAINTAINED OpenAPI document (see ADR 0003). Utoipa auto-generation is deferred to avoid axum/utoipa version lock, so this file is hand-authored and reviewed.
- The runtime schema registry (`overfit-schema-registry`) maps each endpoint to its schema. It has 20 entries and is consulted during the per-request pipeline at the schema-validation step.

## Envelope schema version

Domain events are wrapped in a versioned `EventEnvelope` (`overfit-events`) carrying `EventMetadata` (correlation and causation ids). The envelope schema version is explicit so replay and projection can reason about event shape over time. Bumping the envelope version is a schema change and follows the versioning rules below.

## Versioning rules

- Additive changes (new optional field, new endpoint) are backward compatible and bump the minor contract version.
- Breaking changes (removing or renaming a field, changing a type, tightening a constraint) require a major bump and coordinated updates on both sides.
- Each schema-registry entry carries its own version so the registry and the OpenAPI document can be compared.

## Drift gate

Two gates enforce agreement:

- `pnpm overfit:contracts:generate` regenerates the TS DTOs and runtime validators from the OpenAPI document and writes `generated/overfit/contracts.lock.json` (a hash of schema plus operations).
- `pnpm overfit:contracts:check` fails when the generated contract no longer matches the OpenAPI document.
- `pnpm overfit:schema:check` validates the runtime schema registry against the contract.

These run in CI (`ci:overfit`) and as part of `pnpm overfit:quality`.

## Practical consequence

Because a field lives in the Rust type, the OpenAPI document, the schema registry, and the generated TS contract, any product change must update all of them and pass the drift gate. This is correct and safe. It is also a large part of why Overfit's cost of change is high; see `change-management/risk-trend-change-surface.md`.
