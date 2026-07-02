# ADR 0001 - Next.js + Rust/Axum Polyglot

Status: Accepted

## Context

The Overfit variant must implement the identical SignalOps product as Friction and Flow, but it exists to demonstrate the cost of over-engineered DX. A polyglot stack - a Rust backend and a TypeScript frontend - is a common "best of both worlds" choice: a fast, memory-safe backend service and a rich, typed frontend framework. It is exactly the kind of individually defensible decision that Overfit is built to stress.

## Decision

- Backend: Rust + Axum + Tokio, a Cargo workspace with 17 library crates plus one binary (`apps/overfit-api`), listening on port 3200.
- Frontend: Next.js 16 App Router (`apps/overfit-web`) on port 3300, consuming the Rust API only through a typed, generated-like client.
- The two sides communicate over HTTP using DTOs described by a maintained OpenAPI document (see ADR 0003).

## Consequences

Positive:

- The backend gets Rust's performance and safety; Overfit wins most raw runtime and build/bundle numbers.
- Strong typing on both sides, with the contract enforced at the boundary.

Negative (the reason this variant exists):

- Two toolchains (cargo and pnpm/tsc/Next/vitest) that every contributor must install and learn. The Rust toolchain may be absent on some machines, leaving the backend un-buildable locally.
- Two type systems for one domain, kept in sync via OpenAPI codegen and a drift gate. Every product field is expressed as a Rust type, an OpenAPI schema, and a generated TS type.
- More CI jobs and longer CI (5m10s seed), because everything is built and tested twice.
- Slower onboarding and a higher cost of change: a trivial product change ("Risk trend") crosses the language boundary and lands in ~41 files.

Flow, by contrast, is single-language and single-toolchain, and pays a much lower cost of change for the same product. This ADR records the polyglot choice as deliberate and its downsides as the demonstrable point, not an accident.
