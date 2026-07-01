# Flow — local development

From a fresh clone to a running app, plus how to add each kind of code. All commands are scoped to
Flow.

## Onboard & run

```bash
pnpm flow:doctor     # checks Node >= 20.11, pnpm, lockfile, node_modules, fixtures, docker/act
pnpm install         # install deps (onboard never auto-installs)
pnpm flow:onboard    # doctor + generate fixtures + print next steps
pnpm flow:dev        # http://localhost:3000
```

**Success:** `flow:doctor` prints "doctor passed"; the app loads at `http://localhost:3000`; the
footer shows `API ok`; `/signals`, `/ops`, `/dx-metrics` render.

**Common problems**
- Blank data / 500s → fixtures missing: `pnpm fixtures:generate`.
- Port 3000 in use → stop the other process or set `PORT`.
- Stale build → `pnpm flow:dev:clean`.
- doctor blocks on Node → install Node ≥ 20.11 (`nvm use`).

## Add a UI component (`packages/flow/ui`)

Presentational, data-agnostic (data via props). Never import the data layer.

```bash
pnpm --filter @signalops/flow-ui run typecheck
pnpm --filter @signalops/flow-ui run test
pnpm audit:flow:boundaries
```

Watch for: color-only status (add text labels), `.module.css` ↔ TSX class-name mismatches.
See `packages/flow/ui/src/a11y/*` and [quality-gates.md](quality-gates.md#accessibility).

## Add an API route (`apps/flow-app/src/routes/api/`)

Server endpoints are the only place `flow-server-data-access` may be imported.

```bash
pnpm --filter @signalops/flow-app run typecheck
pnpm build:flow      # regenerates routeTree.gen.ts
```

**Success:** success and failure both log to `/ops` with a request id; the response carries an
`X-Request-Id` header. Pass `request` to `handleEffect` or you lose request-id correlation. See
`apps/flow-app/src/server/respond.ts` and `packages/flow/server-data-access/src/effect/run.ts`.

## Add a feature (screen) package (`packages/flow/feature-*`)

Name it `@signalops/flow-feature-<name>`. Depend only on `flow-ui`, `flow-api-client`,
`flow-domain`, `flow-observability`, `contracts`. **Never** on `server-data-access` or `fixtures`.

```bash
pnpm --filter @signalops/flow-feature-<name> run typecheck
pnpm --filter @signalops/flow-feature-<name> run test
pnpm audit:flow:boundaries
pnpm audit:flow:cycles
pnpm build:flow      # regenerate routeTree.gen.ts
pnpm analyze:flow    # confirm the route is its own lazy chunk
```

Route type errors usually mean `routeTree.gen.ts` is stale (`pnpm build:flow`). A boundary violation
means you imported the server/fixtures from a feature — use `api-client` instead. See
[architecture.md](architecture.md).
