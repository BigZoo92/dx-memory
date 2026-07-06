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
RUN --mount=type=cache,id=overfit-cargo-registry,target=/usr/local/cargo/registry \
    --mount=type=cache,id=overfit-cargo-git,target=/usr/local/cargo/git \
    cargo fetch

# ---- builder ---------------------------------------------------------------
FROM rust:1.83-bookworm AS builder
WORKDIR /build
COPY --from=planner /usr/local/cargo /usr/local/cargo
COPY Cargo.toml Cargo.lock* ./
COPY crates ./crates
COPY apps/overfit-api ./apps/overfit-api
COPY generated ./generated
RUN --mount=type=cache,id=overfit-cargo-registry,target=/usr/local/cargo/registry \
    --mount=type=cache,id=overfit-cargo-git,target=/usr/local/cargo/git \
    --mount=type=cache,id=overfit-cargo-target,target=/build/target \
    cargo build --release -p overfit-api \
    && mkdir -p /out \
    && cp target/release/overfit-api /out/overfit-api

# ---- test stage (optional; `docker build --target test`) -------------------
FROM builder AS test
RUN --mount=type=cache,id=overfit-cargo-registry,target=/usr/local/cargo/registry \
    --mount=type=cache,id=overfit-cargo-git,target=/usr/local/cargo/git \
    --mount=type=cache,id=overfit-cargo-target,target=/build/target \
    cargo test --workspace --release

# ---- runtime: slim, non-root, healthchecked --------------------------------
FROM debian:bookworm-slim AS runtime
ARG APP_VERSION=0.0.0
ARG APP_COMMIT_SHA=unknown
ARG APP_BUILD_TIME=unknown
LABEL org.opencontainers.image.title="signalops-overfit-api" \
      org.opencontainers.image.description="SignalOps Variant C (Overfit) Rust/Axum API" \
      org.opencontainers.image.source="https://example.invalid/signalops-dx-lab" \
      org.opencontainers.image.version=$APP_VERSION \
      org.opencontainers.image.revision=$APP_COMMIT_SHA \
      org.opencontainers.image.created=$APP_BUILD_TIME \
      signalops.variant="overfit"
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/* \
  && useradd --system --uid 10001 --home /app overfit
WORKDIR /app
COPY --from=builder /out/overfit-api /usr/local/bin/overfit-api
USER overfit
ENV OVERFIT_API_PORT=3200
EXPOSE 3200
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:3200/api/health || exit 1
CMD ["overfit-api"]
