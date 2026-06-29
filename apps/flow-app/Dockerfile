# syntax=docker/dockerfile:1
# Multi-stage build for SignalOps Variant B (Flow).
# Build context is the repo ROOT (the workspace) — see docker/flow/README.md.

# ---- base: pnpm via corepack on a slim, debuggable Node image ----
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH"
RUN corepack enable
WORKDIR /repo

# ---- build: install the workspace, build flow-app, isolate prod deps ----
FROM base AS build
COPY . .
# BuildKit cache keeps the pnpm store warm across builds for fast rebuilds.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter @signalops/flow-app build
# `deploy` produces a self-contained dir with only flow-app's PRODUCTION deps.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm --filter @signalops/flow-app deploy --prod /prod/flow-app

# ---- runtime: small, non-root image with only dist + prod node_modules ----
FROM node:22-slim AS runtime
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /prod/flow-app/node_modules ./node_modules
COPY --from=build --chown=node:node /repo/apps/flow-app/dist ./dist
COPY --from=build --chown=node:node /repo/apps/flow-app/server.mjs ./server.mjs
COPY --from=build --chown=node:node /repo/apps/flow-app/package.json ./package.json
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
