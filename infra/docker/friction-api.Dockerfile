# syntax=docker/dockerfile:1

FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH"
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter @signalops/friction-api build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm --filter @signalops/friction-api deploy --prod /prod/friction-api

FROM node:22-slim AS runtime
ARG APP_VERSION=0.0.0
ARG APP_COMMIT_SHA=unknown
ARG APP_BUILD_TIME=unknown
LABEL org.opencontainers.image.title="dx-memory-friction-api" \
      org.opencontainers.image.description="DX Memory Friction Nest API runtime" \
      org.opencontainers.image.version=$APP_VERSION \
      org.opencontainers.image.revision=$APP_COMMIT_SHA \
      org.opencontainers.image.created=$APP_BUILD_TIME \
      signalops.variant="friction"
ENV NODE_ENV=production PORT=3101
WORKDIR /app
COPY --from=build --chown=node:node /prod/friction-api/node_modules ./node_modules
COPY --from=build --chown=node:node /repo/apps/friction-api/dist ./dist
COPY --from=build --chown=node:node /repo/apps/friction-api/package.json ./package.json
USER node
EXPOSE 3101
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3101)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
