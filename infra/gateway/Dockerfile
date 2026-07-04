# syntax=docker/dockerfile:1

FROM node:22-slim AS build
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH"
RUN corepack enable
WORKDIR /repo
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter @signalops/lab-web build
RUN VITE_BASE_PATH=/flow/ VITE_API_BASE_URL=/api/flow pnpm --filter @signalops/flow-app build
RUN node tools/metrics/collect.mjs --no-history
RUN VITE_BASE_PATH=/metrics/ pnpm --filter @signalops/metrics-dashboard build
ARG APP_VERSION=0.0.0
ARG APP_COMMIT_SHA=unknown
ARG APP_BUILD_TIME=unknown
RUN APP_VERSION="$APP_VERSION" APP_COMMIT_SHA="$APP_COMMIT_SHA" APP_BUILD_TIME="$APP_BUILD_TIME" \
  node infra/gateway/write-release-json.mjs /tmp/release.json

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
ARG APP_VERSION=0.0.0
ARG APP_COMMIT_SHA=unknown
ARG APP_BUILD_TIME=unknown
LABEL org.opencontainers.image.title="dx-memory-gateway" \
      org.opencontainers.image.description="DX Memory public gateway and static lab shell" \
      org.opencontainers.image.version=$APP_VERSION \
      org.opencontainers.image.revision=$APP_COMMIT_SHA \
      org.opencontainers.image.created=$APP_BUILD_TIME
COPY infra/gateway/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /repo/apps/lab-web/dist /usr/share/nginx/html
COPY --from=build /repo/apps/flow-app/dist/client/assets /usr/share/nginx/html/flow/assets
COPY --from=build /repo/apps/metrics-dashboard/dist /usr/share/nginx/html/metrics
COPY --from=build /tmp/release.json /usr/share/nginx/html/release.json
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health >/dev/null || exit 1
