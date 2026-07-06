# SignalOps Overfit web — multi-stage Next.js (standalone) build.
# Build context is the repo ROOT (pnpm workspace).
#
#   docker build -f apps/overfit-web/Dockerfile -t signalops-overfit-web:local .

# ---- deps: install the whole workspace (cached on lockfile) ----------------
FROM node:22-bookworm-slim AS deps
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH"
RUN corepack enable
WORKDIR /repo
COPY . .
RUN --mount=type=cache,id=overfit-pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# ---- builder: build the Next standalone output -----------------------------
FROM deps AS builder
WORKDIR /repo
ARG OVERFIT_BASE_PATH=
ARG NEXT_PUBLIC_OVERFIT_BASE_PATH=
ARG NEXT_PUBLIC_OVERFIT_API_BASE=/api
ENV OVERFIT_BASE_PATH=$OVERFIT_BASE_PATH \
    NEXT_PUBLIC_OVERFIT_BASE_PATH=$NEXT_PUBLIC_OVERFIT_BASE_PATH \
    NEXT_PUBLIC_OVERFIT_API_BASE=$NEXT_PUBLIC_OVERFIT_API_BASE \
    NEXT_TELEMETRY_DISABLED=1
RUN --mount=type=cache,id=overfit-next,target=/repo/apps/overfit-web/.next/cache pnpm --filter @signalops/overfit-web build

# ---- runtime: slim, non-root, healthchecked --------------------------------
FROM node:22-bookworm-slim AS runtime
ARG APP_VERSION=0.0.0
ARG APP_COMMIT_SHA=unknown
ARG APP_BUILD_TIME=unknown
ARG NEXT_PUBLIC_OVERFIT_BASE_PATH=
LABEL org.opencontainers.image.title="signalops-overfit-web" \
      org.opencontainers.image.description="SignalOps Variant C (Overfit) Next.js frontend" \
      org.opencontainers.image.version=$APP_VERSION \
      org.opencontainers.image.revision=$APP_COMMIT_SHA \
      org.opencontainers.image.created=$APP_BUILD_TIME \
      signalops.variant="overfit"
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/* \
  && useradd --system --uid 10002 --home /app overfit
WORKDIR /app
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3300 \
    NEXT_PUBLIC_OVERFIT_BASE_PATH=$NEXT_PUBLIC_OVERFIT_BASE_PATH \
    NEXT_TELEMETRY_DISABLED=1
# Next standalone output bundles the server + only the needed node_modules.
COPY --from=builder /repo/apps/overfit-web/.next/standalone ./
COPY --from=builder /repo/apps/overfit-web/.next/static ./apps/overfit-web/.next/static
USER overfit
EXPOSE 3300
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD curl -fsS http://localhost:3300${NEXT_PUBLIC_OVERFIT_BASE_PATH:-}/api/web-health/ || exit 1
CMD ["node", "apps/overfit-web/server.js"]
