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
RUN pnpm install --frozen-lockfile || pnpm install

# ---- builder: build the Next standalone output -----------------------------
FROM deps AS builder
WORKDIR /repo
RUN pnpm --filter @signalops/overfit-web build

# ---- runtime: slim, non-root, healthchecked --------------------------------
FROM node:22-bookworm-slim AS runtime
LABEL org.opencontainers.image.title="signalops-overfit-web" \
      org.opencontainers.image.description="SignalOps Variant C (Overfit) Next.js frontend" \
      signalops.variant="overfit"
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/* \
  && useradd --system --uid 10002 --home /app overfit
WORKDIR /app
ENV NODE_ENV=production PORT=3300
# Next standalone output bundles the server + only the needed node_modules.
COPY --from=builder /repo/apps/overfit-web/.next/standalone ./
COPY --from=builder /repo/apps/overfit-web/.next/static ./apps/overfit-web/.next/static
USER overfit
EXPOSE 3300
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD curl -fsS http://localhost:3300/ || exit 1
CMD ["node", "apps/overfit-web/server.js"]
