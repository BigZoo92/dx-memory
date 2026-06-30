# flow-app — agent instructions (Variant B · Flow)

Scope: strict. Work only inside `apps/flow-app`. Do not edit other variants
(`overfit-*`, `friction-*`), `docs/product/`, or `maquettes/` in this app's tasks.

## What this app is

`flow-app` is a **TanStack Start** application and nothing more. Keep it **thin**.
It owns:

- routes and the app shell;
- providers (Router, Query) and app config;
- API route wrappers (`src/routes/api/`) and the server entry (`src/server/`).

It does **not** own business logic. Do not move feature/domain logic into routes.

## Where code lives

- Screens: `packages/flow/feature-*`.
- Shared UI: `packages/flow/ui`.
- Browser API client: `packages/flow/api-client`.
- Server data access: `packages/flow/server-data-access` (server-only).

Rules:

- A route is a thin wrapper: resolve params, call a feature, render. No data shaping.
- Only `src/routes/api/` and `src/server/` may import `@signalops/flow-server-data-access`.
  Any module that imports server data access is server-only and must never reach the client bundle.
- `routeTree.gen.ts` is generated. Do not hand-edit it.

## Recommended commands

```bash
pnpm nx run flow-app:typecheck
pnpm nx run flow-app:test
pnpm nx run flow-app:build
pnpm audit:flow:boundaries
pnpm audit:flow:cycles
```

## Working style

- Read a file before editing it. Never edit blind.
- Simplest working solution. No speculative features or premature abstraction.
- Return code first; explain only the non-obvious. Comments only where logic is unclear.
- No docstrings or type annotations on code you are not changing.
- No error handling for cases that cannot happen.
- Plain hyphens and straight quotes only. No em-dashes, smart quotes, decorative Unicode, or emojis.
- Do not guess APIs, versions, flags, or package names. Verify in code or docs first.
