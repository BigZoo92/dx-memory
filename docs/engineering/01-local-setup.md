# 01 — Local setup

## Prerequisites

- Node.js ≥ 20.11 (tested on Node 22)
- pnpm ≥ 9 — enable via corepack:

  ```bash
  corepack enable
  corepack prepare pnpm@9.15.0 --activate
  ```

  (or install pnpm globally any other way)

## Install

```bash
pnpm install
```

This links the five `@signalops/*` workspace packages and installs the shared dev tooling
(TypeScript, Vitest, tsx, Nx, Prettier).

## Everyday commands

| Command                  | What it does                                                 |
| ------------------------ | ------------------------------------------------------------ |
| `pnpm fixtures:generate` | regenerate the dataset into `packages/fixtures/data/*.json`  |
| `pnpm typecheck`         | `nx run-many -t typecheck` across shared packages            |
| `pnpm test`              | `nx run-many -t test` (Vitest)                               |
| `pnpm build`             | `nx run-many -t build` (type-only build for source packages) |
| `pnpm lint`              | `nx run-many -t lint` (Prettier check per package)           |
| `pnpm format`            | `prettier --write .`                                         |
| `pnpm metrics:collect`   | collect DX metrics into `packages/metrics/results/*.json`    |
| `pnpm metrics:all`       | `fixtures:generate` then `metrics:collect`                   |

Run a single package's task with pnpm filters, e.g.:

```bash
pnpm --filter @signalops/contracts test
pnpm --filter @signalops/fixtures generate
```

## Recommended first run

```bash
pnpm install
pnpm fixtures:generate
pnpm typecheck
pnpm test
pnpm metrics:collect
```

## Notes

- Generated files (`packages/fixtures/data/*.json`, `packages/metrics/results/*.json`) are
  git-ignored. Regenerate them anytime — output is deterministic.
- Nx caches task results in `.nx/` (git-ignored). If Nx's daemon misbehaves in a restricted
  sandbox, disable it: `NX_DAEMON=false pnpm test`.
