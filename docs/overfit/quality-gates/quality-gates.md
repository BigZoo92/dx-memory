# Quality Gates

Overfit ships five local quality gates. They are lightweight and fast by design: each is a small, deterministic check you can run before pushing. The weight of Overfit is not in the gates themselves - it is in how many coordinated things must be true for one product change to pass all of them.

## The five gates

1. Contracts drift - `pnpm overfit:contracts:check`. Verifies the generated TS contract in `packages/overfit/contracts-generated` matches `generated/overfit/openapi.json`, using the hash in `generated/overfit/contracts.lock.json`. Fails on drift.
2. Schema - `pnpm overfit:schema:check`. Verifies the runtime schema registry (20 entries) agrees with the contract and that the EventEnvelope schema version is consistent.
3. Docs - `pnpm overfit:docs:check`. Verifies the docs set is present and consistent (this variant tracks 8 docs pages).
4. Policy manifest - `pnpm overfit:policy:check`. Validates the policy definitions (route access, schema, redaction, AI, feature flags) and the AI governance manifest, including forbidden-files and reviewer routing.
5. Bundle budget - checks the frontend bundle stays within budget (seed 164KB total, 96KB main chunk).

Alongside the gates, `pnpm overfit:boundaries` runs dependency-cruiser (strict) to enforce the package boundaries described in `architecture/boundaries.md`.

## How to run

Run all gates at once:

```
pnpm overfit:quality
```

Or run them individually with the commands above. They run in CI as part of `pnpm ci:overfit`.

## Lightweight and local by design

The gates do not require the Rust toolchain, a network, or a running server. They read files and compare hashes, schemas, manifests, and bundle sizes. That means they run fully even on a machine without cargo (see the local-development runbook), and they give fast feedback locally before CI.

## What they protect

Together the gates guarantee that the two type systems agree (contracts + schema), the docs stay in step (docs), governance rules hold (policy), and performance does not regress (bundle). This is exactly the safety net you want. It is also the checklist a trivial product change must satisfy end to end - which, combined with the 41-file change surface in `change-management/risk-trend-change-surface.md`, is why Overfit demonstrates that even cheap, well-built gates add up to a high cost of change when there are enough of them.
