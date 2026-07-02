# SignalOps Overfit API — deliberately sophisticated multi-stage Rust build.
# Build context is the repo ROOT (needs the whole Cargo workspace + generated/overfit/openapi.json).
#
#   docker build -f apps/overfit-api/Dockerfile -t signalops-overfit-api:local .

# ---- planner: cache dependency compilation separately from source ----------
FROM rust:1.83-bookworm AS planner
WORKDIR /build
# Copy the manifests first so the dependency layer caches independently of source churn.
COPY Cargo.toml Cargo.lock* ./
COPY crates ./crates
COPY apps/overfit-api ./apps/overfit-api
# Prime the dependency cache (source is copied again in the builder for the real compile).
RUN cargo fetch

# ---- builder ---------------------------------------------------------------
FROM rust:1.83-bookworm AS builder
WORKDIR /build
COPY --from=planner /usr/local/cargo /usr/local/cargo
COPY Cargo.toml Cargo.lock* ./
COPY crates ./crates
COPY apps/overfit-api ./apps/overfit-api
COPY generated ./generated
RUN cargo build --release -p overfit-api

# ---- test stage (optional; `docker build --target test`) -------------------
FROM builder AS test
RUN cargo test --workspace --release

# ---- runtime: slim, non-root, healthchecked --------------------------------
FROM debian:bookworm-slim AS runtime
LABEL org.opencontainers.image.title="signalops-overfit-api" \
      org.opencontainers.image.description="SignalOps Variant C (Overfit) Rust/Axum API" \
      org.opencontainers.image.source="https://example.invalid/signalops-dx-lab" \
      signalops.variant="overfit"
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/* \
  && useradd --system --uid 10001 --home /app overfit
WORKDIR /app
COPY --from=builder /build/target/release/overfit-api /usr/local/bin/overfit-api
USER overfit
ENV OVERFIT_API_PORT=3200
EXPOSE 3200
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:3200/api/health || exit 1
CMD ["overfit-api"]
