# Overfit (Variant C) - Overview

Overfit is the deliberately over-engineered variant of the SignalOps DX Lab. It ships the exact same product as the Friction and Flow variants (same routes, same design tokens, same visible behavior) but implements it with a maximal, individually well-built technical stack. Every layer is defensible in isolation. The whole is far too heavy for the problem it solves.

## What Overfit is for

Overfit exists to be a technical proof of a single thesis: too much DX can kill DX. Each piece (CQRS, event sourcing, full observability, polyglot Rust + TypeScript, strict boundaries, generated contracts, AI governance) is a legitimate engineering practice. Stacked together over a read-only demo dataset, they make the cost of change disproportionate. The showcase is not that Overfit is broken - it is not. The showcase is that a trivial product change ("add a Risk trend column") forces a coordinated edit across roughly 41 files, 72 impacted tests, and 8 docs, where Flow needs about 6 files, 9 tests, and 1 doc.

## How it maps to the thesis

- Overfit WINS most raw runtime numbers: build 26s, bundle 164KB, main chunk 96KB, table render 90ms, Lighthouse 97.
- Overfit LOSES on cost of change: 41 files touched, 72 tests impacted, 9 error-repro steps, 8 docs pages.
- Flow is the balanced middle: it accepts slightly heavier runtime numbers to keep the cost of change low.

The DX metrics page (`/dx-metrics`) surfaces these numbers side by side across all three variants.

## The product (identical across variants)

Routes: `/` (Overview), `/signals` (Signals Explorer, 10,000-row server-paginated dataset), `/signals/:id` (Signal Detail), `/incidents`, `/compare`, `/dx-metrics`, `/settings`, `/ops` (Operational health).

Design tokens: background `#f6f7f8`, cards `#fff`, border `#e8eaed`, accent orange `#ef7e00`, sidebar 248px, topbar 60px, content max 1140px, Geist fonts.

## Architecture at a glance

- Backend: Rust + Axum + Tokio, a Cargo workspace with 17 library crates plus 1 binary (`apps/overfit-api`).
- Frontend: Next.js 16 App Router (`apps/overfit-web`) consuming the Rust API only through a typed, generated-like client.
- Contracts: a maintained `generated/overfit/openapi.json`, a generated-like TS client, and a drift check.

## How to run

- API (Rust): `pnpm overfit:api:dev` (or `cargo run -p overfit-api`). Listens on port 3200 (`OVERFIT_API_PORT`).
- Web (Next.js): `pnpm overfit:web:dev`. Listens on port 3300.
- Full stack via Docker: `pnpm overfit:dev` (docker compose, `docker-compose.overfit.yml`).

Note: the Rust toolchain (cargo) may be absent on a given machine. The JS/TS side runs fully without it; `cargo build/test/clippy` require a Rust install (rustup). See the local development runbook.

## Where to go next

- Architecture: `architecture/architecture-overview.md`, `architecture/boundaries.md`, `architecture/polyglot-cost.md`
- Decisions: `adr/0001` through `adr/0004`
- Operations: `runbooks/local-development.md`, `runbooks/debugging.md`, `runbooks/diagnostic-pack.md`
- Policies: `policies/` (schema, release, observability, testing)
- AI governance: `ai-governance/`
- The key proof: `change-management/risk-trend-change-surface.md`
- Quality gates: `quality-gates/quality-gates.md`
