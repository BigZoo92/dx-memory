# syntax=docker/dockerfile:1

FROM node:22-slim AS build
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH"
RUN corepack enable
WORKDIR /repo
ARG VITE_BASE_PATH=/friction/
ARG VITE_API_BASE=/api/friction
ENV VITE_BASE_PATH=$VITE_BASE_PATH VITE_API_BASE=$VITE_API_BASE
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter @signalops/friction-web build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
ARG APP_VERSION=0.0.0
ARG APP_COMMIT_SHA=unknown
ARG APP_BUILD_TIME=unknown
LABEL org.opencontainers.image.title="dx-memory-friction-web" \
      org.opencontainers.image.description="DX Memory Friction static web runtime" \
      org.opencontainers.image.version=$APP_VERSION \
      org.opencontainers.image.revision=$APP_COMMIT_SHA \
      org.opencontainers.image.created=$APP_BUILD_TIME \
      signalops.variant="friction"
COPY infra/docker/friction-web.nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/friction-web/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health >/dev/null || exit 1
