# Runbook - Local Development

How to run Overfit's API and web app on your machine.

## Prerequisites

- Node + pnpm for the frontend and the quality gates.
- Rust toolchain (rustup, cargo) for the backend.
- Optional: Docker + Docker Compose for the full-stack path.

Important environment note: the Rust toolchain (cargo) may be absent on a given machine. The JS/TS side - typecheck, Next build, vitest, and the quality gates - runs fully without it. `cargo build`, `cargo test`, and `cargo clippy` require a Rust install (rustup). If cargo is missing, install it with rustup, or use a machine that has it, or run only the JS/TS half.

## Run the API (Rust, port 3200)

```
pnpm overfit:api:dev
# equivalent to:
cargo run -p overfit-api
```

The API listens on port 3200 by default. Override with the `OVERFIT_API_PORT` environment variable:

```
OVERFIT_API_PORT=3201 cargo run -p overfit-api
```

At boot the API seeds the fixtures (10,000 signals, 300 incidents, ~20,300 events) deterministically via the mulberry32 generator, so every run produces the same data.

Verify it is up:

```
curl http://localhost:3200/api/health
```

## Run the web app (Next.js, port 3300)

```
pnpm overfit:web:dev
```

The web app listens on port 3300 and consumes the API on 3200 through the typed client. Start the API first so the pages have data. Then open `http://localhost:3300`.

## Other backend commands

```
pnpm overfit:api:test     # cargo test
pnpm overfit:api:fmt      # cargo fmt
pnpm overfit:api:clippy   # cargo clippy
pnpm overfit:api:build    # cargo build
```

## Other frontend commands

```
pnpm overfit:web:typecheck
pnpm overfit:web:test
pnpm overfit:web:build
```

## Docker Compose alternative

To run both services together without installing the toolchains directly:

```
pnpm overfit:dev
```

This uses `docker-compose.overfit.yml`, which builds `apps/overfit-api/Dockerfile` (multi-stage Rust: planner/builder/test/runtime, non-root, healthcheck) and `apps/overfit-web/Dockerfile` (multi-stage Next standalone). Build the images with `pnpm docker:build:overfit`. This path needs Docker but not a local Rust install.

## Ports summary

- API: 3200 (`OVERFIT_API_PORT`)
- Web: 3300
