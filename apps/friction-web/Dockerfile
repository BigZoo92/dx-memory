# Friction web - single-stage, unoptimized image. Build context is the repo ROOT.
# Builds the SPA and serves the static output with `vite preview`. The API base URL is baked
# in at build time (defaults to the api service on localhost:3101).
FROM node:22
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH"
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install
ARG VITE_API_BASE=http://localhost:3101/api
ENV VITE_API_BASE=$VITE_API_BASE
RUN pnpm --filter @signalops/friction-web build
EXPOSE 3100
CMD ["pnpm", "--filter", "@signalops/friction-web", "preview"]
