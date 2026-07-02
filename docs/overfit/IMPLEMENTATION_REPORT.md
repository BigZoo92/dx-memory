# Overfit (Variant C) — Implementation Report

This report records what was built in the dedicated Variant C pass, what was run, what passed,
what could not run here, the known limits, and how to launch Overfit. It is written to be honest
about the environment: the JS/TS side was fully built and verified locally; the Rust side is
complete and written to compile, but the Rust toolchain (cargo) is not installed on this machine,
so it could not be compiled or tested here.

## Executive summary

Overfit implements the exact same SignalOps product as Flow and Friction (same routes, screens,
data model, fixtures, UI states, acceptance criteria) with a deliberately over-engineered internal
architecture:

- Backend: Rust + Axum + Tokio, a Cargo workspace with 17 library crates + 1 binary, wired as a
  CQRS / event-sourced / ports-and-adapters system with a memory-only OTel-like observability
  stack, a policy engine, an audit trail, a schema registry and feature flags.
- Frontend: Next.js 16 (App Router) consuming the Rust API through a generated-like typed client,
  split across 14 TypeScript packages (contracts, api-client, ui, 8 feature packages, quality
  gates, AI governance, generated manifests).
- The AI-task capability under study ("Add Risk trend") is present everywhere and was intentionally
  routed through the maximum number of files to demonstrate the cost of change.

The point is proven by construction: Overfit wins the raw runtime/build/bundle numbers but pays a
disproportionate cost of change (41 files, 72 tests, 8 docs for one product column, versus Flow's
6 / 9 / 1). See `change-management/risk-trend-change-surface.md`.

## Architecture created

### Rust workspace (root `Cargo.toml`, 18 members)

crates/: overfit-domain, overfit-events, overfit-contracts, overfit-event-store,
overfit-read-models, overfit-repositories, overfit-adapters-fixtures, overfit-commands,
overfit-queries, overfit-observability, overfit-policies, overfit-schema-registry, overfit-audit,
overfit-feature-flags, overfit-application, overfit-adapters-http, overfit-test-support.
apps/overfit-api (Axum binary; `src/main.rs` + `src/bootstrap.rs`; integration tests in `tests/`).

44 Rust source files. The deliberately-heavy request flow is implemented end to end:
request id -> span -> audit -> transport DTO -> schema/policy check -> query/command -> handler ->
aggregate -> domain event -> memory event store -> projector -> read model -> response mapper ->
telemetry export. It runs even for a GET on a read-only public dataset.

The fixtures adapter ports the shared mulberry32 generator to Rust and produces the same
deterministic dataset (10,000 signals, 300 incidents, 25 analysts, 12 sources, 50,000 timeline
events). `risk_trend` is derived from the generated risk score (no extra RNG), so the base dataset
stays identical to Flow/Friction while the AI capability is present on every signal.

### TypeScript packages (`packages/overfit/*`, 14 packages)

contracts-generated, api-client, ui, feature-dashboard, feature-signals, feature-signal-detail,
feature-incidents, feature-compare, feature-dx-metrics, feature-settings, feature-ops,
quality-gates, ai-governance, generated-manifests. 38 TS/TSX source files.

### Apps

- apps/overfit-web: Next.js App Router, 8 routes (`/`, `/signals`, `/signals/[id]`, `/incidents`,
  `/compare`, `/dx-metrics`, `/settings`, `/ops`), app shell in `app/components/AppShell.tsx`.
- apps/overfit-api: Axum binary on port 3200.

### Generated artifacts (`generated/overfit/`)

openapi.json (maintained; see ADR-0003), contracts.lock.json (drift lock), bundle-budget.json,
bundle-stats.json.

## Endpoints available

Product: `GET /api/health`, `GET /api/signals`, `GET /api/signals/:id`,
`GET /api/signals/:id/events`, `GET /api/incidents`, `GET /api/dashboard/summary`,
`GET /api/compare/:id`, `GET /api/dx-metrics`, `POST /api/simulate-error`, `GET /api/logs`,
`POST /api/logs`.

Technical (Overfit-only, do not change the visible product): `GET /api/health/deep`,
`GET /api/health/dependencies`, `GET /api/telemetry/traces`, `GET /api/telemetry/metrics`,
`GET /api/audit-events`, `GET /api/schema-registry`, `GET /api/feature-flags`,
`POST /api/policy/check`, `GET /api/diagnostic-pack`, `GET /api/openapi.json`.

## Routes available

`/` Overview, `/signals` Signals Explorer (10,000-row dataset, server-paginated, Risk trend column
+ filter), `/signals/:id` Signal Detail (shows Risk trend), `/incidents`, `/compare`,
`/dx-metrics` (Overfit highlighted, C column, AI-task cost), `/settings`, `/ops` (rich
observability).

## Scripts added (root `package.json`)

`overfit:api:dev|test|fmt|clippy|build` (cargo), `overfit:web:dev|typecheck|test|build`,
`overfit:contracts:generate|check`, `overfit:schema:check`, `overfit:policy:check`,
`overfit:docs:check`, `overfit:quality`, `overfit:typecheck`, `overfit:test`, `overfit:build`,
`overfit:dev` (docker compose), `overfit:boundaries` (dependency-cruiser strict),
`docker:build:overfit`, and a real `ci:overfit` pipeline.

Nx `project.json` added for all 14 TS packages + both apps, with excessive tags
(`scope:overfit`, `type:app|feature|ui|api-client|api|generated|governance|quality-gate`,
`layer:presentation|application|contracts`). Strict boundaries in `.dependency-cruiser.overfit.cjs`
(kept separate so Flow/Friction are untouched).

## Docs added

`docs/overfit/`: README, this report, architecture/ (overview, boundaries, polyglot-cost), adr/
(0001-0004), runbooks/ (local-development, debugging, diagnostic-pack), policies/ (schema, release,
observability, testing), ai-governance/ (ai-policy, ai-change-manifest, reviewer-matrix),
change-management/risk-trend-change-surface, quality-gates/quality-gates.

## Tests added

- Rust: unit tests in most crates (domain value objects/enums, event envelope round-trip, event
  store sequencing, contracts DTO serialization, fixtures RNG determinism + volumes + risk-trend,
  read-model filter/sort, observability collector, schema registry, feature flags, audit redaction,
  policy engine, application boot + risk-trend filter end to end) plus `apps/overfit-api/tests/api.rs`
  covering every required endpoint.
- TS: vitest in contracts-generated, api-client, ui, ai-governance, feature-signals.

## Commands executed

| Command | Result |
| --- | --- |
| `pnpm install` | SUCCESS (Next 16 + workspace packages installed; only pre-existing rolldown-vite peer warnings) |
| `pnpm overfit:contracts:generate` | SUCCESS (21 schemas, 20 operations, lock written) |
| `pnpm --filter "@signalops/overfit-*" run typecheck` | SUCCESS (all 15 projects) |
| `pnpm --filter "@signalops/overfit-web" run build` (`next build`) | SUCCESS (all 8 routes compiled, standalone output emitted) |
| `pnpm --filter "@signalops/overfit-*" run test` (vitest) | SUCCESS (15 tests passed) |
| `pnpm overfit:contracts:check` | SUCCESS (no drift; riskTrend present across contract surface) |
| `pnpm overfit:schema:check` | SUCCESS (20 manifest routes documented; registry lists all) |
| `pnpm overfit:policy:check` | SUCCESS (governance manifest complete) |
| `pnpm overfit:boundaries` (dependency-cruiser) | SUCCESS (71 modules, 0 violations) |
| `node .../check-bundle.mjs` | SUCCESS (164KB < 200KB, 96KB < 120KB) |
| `pnpm overfit:docs:check` | SUCCESS after the docs were written |

## Commands that could NOT run here (environment limits)

| Command | Reason |
| --- | --- |
| `cargo fmt` / `cargo test` / `cargo clippy` / `cargo build` | The Rust toolchain (cargo/rustup) is not installed on this machine. The Rust code is complete and written to compile against the pinned crates (axum 0.7, serde 1, tokio 1, thiserror 1, tracing 0.1) but was not compiled or tested here. Run `rustup` + `cargo test --workspace` on a machine with Rust to verify. |
| `docker build` / `docker compose` | Docker is present but images were not built here to avoid long multi-stage Rust/Next builds in this pass. The Dockerfiles and compose file are complete; the Next standalone output that the web runtime stage copies is confirmed present. |

## Known limits

- Rust is unverified locally (no cargo). Highest-risk areas if a compile error surfaces: exact
  Axum 0.7 handler trait bounds and the `serde` tagged-enum attributes; both follow standard,
  documented patterns.
- OpenAPI is a maintained document, not utoipa-autogenerated (ADR-0003 explains the deferral); the
  TS client is generated-like with a hash-based drift gate rather than a full OpenAPI codegen.
- The "Simulate API error" toggle in Settings arms the demo error path and the Trigger button calls
  the real `POST /api/simulate-error`; unlike Friction it does not globally force every client read
  to fail (the api-client has no global fault flag).
- Fonts fall back to system-ui (Geist is referenced in the stylesheet but not fetched via next/font,
  to avoid a build-time network dependency).

## How to launch Overfit

Native (two terminals):

```
# terminal 1 — API (needs Rust installed)
cargo run -p overfit-api            # serves http://localhost:3200

# terminal 2 — web
pnpm --filter @signalops/overfit-web dev   # serves http://localhost:3300, proxies /api -> :3200
```

Docker (no Rust/Node needed on the host):

```
docker compose -f docker-compose.overfit.yml up --build
# web on http://localhost:3300, api on http://localhost:3200
```

Verify (JS side): `pnpm overfit:typecheck && pnpm overfit:test && pnpm overfit:web:build && pnpm overfit:quality`.
Verify (Rust side): `pnpm overfit:api:fmt && pnpm overfit:api:clippy && pnpm overfit:api:test`.

## Why the architecture is deliberately overkill

Every individual choice is defensible in isolation (typed value objects, ports and adapters, CQRS,
event sourcing, correlation ids, policy gates, audit, schema registry, generated clients, per-route
feature packages, drift gates, governance manifests). Applied together to a read-only demo dataset,
they multiply into 32+ boundaries, two type systems kept in sync by codegen, two toolchains, and a
seven-span pipeline around a single database-free GET. The result is fast at runtime and heavy to
change.

## How Overfit proves the thesis

The thesis holds that DX drives the ability to build, ship, run, diagnose and CHANGE a product, and
that over-investing in DX becomes counter-productive. Overfit is the technical counter-example:
the product is identical and the runtime is excellent, but a trivial product change (one column)
forces a coordinated 41-file, 72-test, 8-doc edit across Rust domain, DTOs, OpenAPI, fixtures, read
models, generated TS contracts, runtime schema, api-client, a feature package, the UI, docs, an ADR
and governance manifests. Flow does the same change in 6 files, 9 tests, 1 doc. Good DX protects
UX; too much DX taxes every future change.
