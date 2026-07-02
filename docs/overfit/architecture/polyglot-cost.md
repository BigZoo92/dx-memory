# Polyglot Cost

Overfit runs a Rust + Axum backend and a TypeScript + Next.js frontend. Two first-class languages, joined by roughly 32 module boundaries across the two sides. Each choice is defensible: Rust gives a fast, safe backend; TypeScript gives a rich, typed frontend. The combination has a concrete, recurring cost that this document names.

## Two toolchains

- Rust: cargo for build/test/format/lint (`overfit:api:build|test|fmt|clippy`), plus rustup to install the toolchain.
- JS/TS: pnpm, tsc, Next, vitest, dependency-cruiser (`overfit:web:*`, `overfit:boundaries`).

A developer must install and understand both. Onboarding is slower: you cannot be productive across the whole variant until you can build and test in both ecosystems. The Rust toolchain may even be absent on a given machine, in which case the JS/TS half still runs but the Rust half cannot build or test locally.

## Two type systems kept in sync

The domain types exist twice: once as Rust types in `overfit-domain` / `overfit-contracts`, once as TypeScript types in `packages/overfit/contracts-generated`. They are kept in sync through OpenAPI codegen: `generated/overfit/openapi.json` is the contract, and `pnpm overfit:contracts:generate` produces the TS DTOs and runtime validators. A drift check (`overfit:contracts:check`) fails the build if the two sides diverge.

This works, but it means a single field must be added to a Rust type, to the OpenAPI document, and then regenerated into TS - three representations of one concept, with a gate to prove they agree.

## More CI jobs

Because there are two toolchains, CI has to do everything twice. `ci:overfit` runs cargo build/test/clippy/fmt on the Rust side and typecheck/test/build/boundaries on the TS side, then the contract, schema, docs, and policy gates on top. More jobs means more wall-clock CI time (Overfit's CI seed is 5m10s) and more places for a change to fail.

## Contrast with Flow

Flow is single-language and single-toolchain. The domain type exists once. There is no OpenAPI codegen boundary to keep two type systems in sync, no second test runner, no second linter, no cross-language drift gate. A field added to the product touches one type in one place. Flow trades a little runtime performance for this cohesion, and as a result its cost of change is far lower: the same "Risk trend" change is about 6 files in Flow versus about 41 in Overfit. The polyglot split is the single largest structural reason for that gap.
