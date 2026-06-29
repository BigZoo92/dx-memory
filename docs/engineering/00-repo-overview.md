# 00 — Repository overview

SignalOps DX Lab is a pnpm + Nx + TypeScript monorepo. It builds **one product three times** to
compare the total cost of delivery under different DX choices. To keep the comparison fair,
everything the variants must share lives in `packages/*` and is consumed identically.

## Layout

```txt
apps/            variant placeholders (friction-web/-api, flow-app, overfit-web/-api)
packages/        shared source of truth (consumed by every variant)
  contracts/       types & API contracts          → @signalops/contracts
  fixtures/        deterministic dataset generator → @signalops/fixtures
  metrics/         DX metrics collection           → @signalops/metrics
  test-scenarios/  common user scenarios           → @signalops/test-scenarios
  ui-spec/         typed tokens/routes/screens     → @signalops/ui-spec
docs/product/    binding contract & specs (do not edit in the socle pass)
docs/engineering/ this folder
docker/          per-variant Docker skeletons
.github/workflows/ CI skeletons
maquettes/       clickable design reference (do not move/delete)
```

## Dependency graph (shared packages)

```txt
contracts  ←  fixtures  ←  metrics
contracts  ←  test-scenarios
contracts  ←  ui-spec
```

`contracts` has no internal dependencies; everything else builds on it.

## Why source-only packages?

The shared packages are consumed **as TypeScript source** (their `main`/`exports` point at
`src/index.ts`). They are resolved three ways:

- type-checking: `tsconfig.base.json` `paths` map `@signalops/*` to each package's `src`;
- scripts (`fixtures:generate`, `metrics:collect`): run with `tsx`, no build step;
- tests: Vitest resolves the workspace symlinks to source.

So there is no build/emit step to keep in sync, and the variants get types + values directly.
Each package's `build`/`typecheck` target is therefore a `tsc --noEmit` validation.

## Tooling

| Tool                | Role                                              |
| ------------------- | ------------------------------------------------- |
| pnpm workspaces     | package linking & installs                        |
| Nx                  | task runner / caching (`nx run-many -t <target>`) |
| TypeScript (strict) | types across the repo                             |
| Vitest              | tests for shared packages                         |
| tsx                 | run TS scripts without a build                    |
| Prettier            | formatting (and the minimal `lint` check)         |

See [01-local-setup.md](01-local-setup.md) to get running.
