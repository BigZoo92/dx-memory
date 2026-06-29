# docker/flow — Variant B (Flow)

Multi-stage Docker build for the single full-stack `flow-app` (TanStack Start).

The Dockerfile lives next to the app at [`apps/flow-app/Dockerfile`](../../apps/flow-app/Dockerfile)
(so it ships with the app), and the **build context is the repo root** (the app is built from the
pnpm workspace).

## Stages

1. **base** — `node:22-slim` + pnpm via corepack (`packageManager` pins pnpm 9.15.0). Slim, not
   alpine — easy to debug, no native-module surprises.
2. **build** — copies the workspace, `pnpm install --frozen-lockfile` (BuildKit cache mount keeps
   the pnpm store warm), `pnpm --filter @signalops/flow-app build`, then
   `pnpm --filter @signalops/flow-app deploy --prod /prod/flow-app` to isolate **production-only**
   dependencies.
3. **runtime** — `node:22-slim`, runs as the non-root `node` user, contains only `dist/`, the
   production `node_modules`, `server.mjs` and `package.json`.

`vite build` emits a Web-standard `{ fetch }` handler (`dist/server/server.js`), not a self-listening
server. [`server.mjs`](../../apps/flow-app/server.mjs) serves it on a port with `srvx` (the unjs
universal server used by h3), so the container runs a plain `node server.mjs`.

## Build & run

```bash
# from the repo root (build context = workspace root)
docker build -f apps/flow-app/Dockerfile -t signalops-flow:local .
# or via Nx:
pnpm nx run flow-app:docker-build
# or the root script:
pnpm docker:build:flow

docker run --rm -p 3000:3000 signalops-flow:local
# → http://localhost:3000  ·  API at http://localhost:3000/api/health
```

## Environment variables

| Variable               | Default | Purpose                                                          |
| ---------------------- | ------- | ---------------------------------------------------------------- |
| `PORT`                 | `3000`  | Port the server listens on (`0.0.0.0`).                          |
| `METRICS_RESULTS_PATH` | unset   | Path to a collected `results.json`; absent → `/dx-metrics` seed. |

## Health & port

- Exposes **`3000`**.
- `HEALTHCHECK` polls `/api/health` (returns the canonical health envelope).

## Notes & limits

- The dataset is generated **in-process** (deterministic, from `@signalops/fixtures`), so no fixture
  JSON needs to ship in the image.
- Image size is ~550 MB (slim base + the TanStack/React production tree). Chosen for debuggability
  over a few tens of MB; a distroless final stage is a possible future optimization.
- Verified locally: container boots, `/api/health` returns `Variant B — Flow`, and
  `/api/signals?severity=critical` filters correctly.
