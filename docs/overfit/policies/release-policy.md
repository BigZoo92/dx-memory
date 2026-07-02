# Release Policy

A change to Overfit is releasable only when all quality gates pass. This policy lists the gates, the CI entry point, and the versioning rules.

## Release gates

A release must pass all five gates (see `quality-gates/quality-gates.md` for how they run):

1. Contracts drift - `pnpm overfit:contracts:check`. The generated TS contract must match `generated/overfit/openapi.json` (verified against `contracts.lock.json`).
2. Schema - `pnpm overfit:schema:check`. The runtime schema registry must agree with the contract, and the envelope schema version must be consistent.
3. Docs - `pnpm overfit:docs:check`. The docs set must be present and consistent with the change (Overfit's docs count is a tracked metric; 8 docs pages for this variant column).
4. Policy manifest - `pnpm overfit:policy:check`. The policy definitions (route access, schema, redaction, AI, feature flags) and the AI governance manifest must validate.
5. Bundle budget - the frontend bundle must stay within budget (seed 164KB total, 96KB main chunk).

In addition, both toolchains must be green: Rust (`cargo build/test/clippy/fmt`) and TS (`overfit:web:typecheck|test|build`, `overfit:boundaries`).

## CI

`pnpm ci:overfit` is the single CI entry point. It runs the dual-toolchain build and test plus all five gates. The Overfit CI seed is 5m10s, reflecting the doubled toolchain work. If cargo is absent on a runner, the Rust jobs cannot run; a full release requires a runner with the Rust toolchain installed (rustup).

## Versioning

- The API contract follows semantic versioning as described in `schema-policy.md`: additive is minor, breaking is major.
- Breaking contract changes require the OpenAPI document, the schema registry, and the regenerated TS contract to move together in the same release, and the contracts and schema gates must pass.
- Release notes / changelog updates are part of the change surface for any product-visible change (see the risk-trend change surface doc).

## Principle

The gates are lightweight and local by design (see the quality-gates doc). They are cheap to run but numerous, which is consistent with the whole variant: the cost is not in any single gate, it is in how many coordinated things must be true at once for one product change.
