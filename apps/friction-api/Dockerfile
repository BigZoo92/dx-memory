# Friction API - single-stage, unoptimized image. Build context is the repo ROOT.
# It copies the whole workspace and keeps all dependencies (no pruning, no multi-stage).
FROM node:22
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH"
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install
RUN pnpm --filter @signalops/friction-api build
EXPOSE 3101
CMD ["node", "apps/friction-api/dist/main.js"]
