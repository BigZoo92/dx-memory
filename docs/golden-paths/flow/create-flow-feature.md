# Create a Flow feature

Add a new screen package under `packages/flow/feature-*`.

## Steps

1. Copy the shape of an existing feature (e.g. `packages/flow/feature-ops`): `package.json`,
   `tsconfig.json`, `vitest.config.ts`, `vitest.setup.ts`, `src/css-modules.d.ts`, `src/index.ts`.
2. Name it `@signalops/flow-feature-<name>`; depend only on `flow-ui`, `flow-api-client`, `flow-domain`,
   `flow-observability` and `contracts` as needed. Never on `server-data-access` or `fixtures`.
3. Add the path to `tsconfig.base.json` and tsconfig `references` to the consuming app.
4. Build the screen with components from `flow-ui`; fetch via `flow-api-client` hooks.
5. Add a thin route in `apps/flow-app/src/routes/<name>.tsx` (`createFileRoute(...).component`).
6. `pnpm install --offline` (link), then `pnpm build:flow` once to regenerate `routeTree.gen.ts`.

## Success criteria

- `pnpm --filter @signalops/flow-feature-<name> run typecheck` and `test` are green.
- `pnpm audit:flow:boundaries` and `pnpm audit:flow:cycles` pass.
- The route renders and is its own lazy chunk in `pnpm analyze:flow`.

## Common failures

- **Route type error** - `routeTree.gen.ts` not regenerated. Run `pnpm build:flow`.
- **Boundary violation** - you imported `server-data-access`/`fixtures` from a feature. Use the
  api-client instead.

## See also

- `packages/flow/CLAUDE.md`, `docs/audit/flow/flow-boundaries.md`
