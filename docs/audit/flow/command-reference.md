# Flow - command reference

One command, one intention. All scoped to Flow.

## Onboarding & environment

| Command | What it does |
| --- | --- |
| `pnpm flow:doctor` | Check Node >= 20.11, pnpm, lockfile, node_modules, fixtures, docker/act |
| `pnpm flow:onboard` | doctor + fixtures + next-steps (never auto-installs) |
| `pnpm flow:setup` | `pnpm install && pnpm fixtures:generate` |

## Develop

| Command | What it does |
| --- | --- |
| `pnpm flow:dev` | Start the app at http://localhost:3000 |
| `pnpm flow:dev:clean` | Clear `.output`/`dist` then start |
| `pnpm flow:dev:docker` | Build + run the Docker image |

## Verify

| Command | What it does |
| --- | --- |
| `pnpm flow:ci:fast` | lint + typecheck + tests + boundaries + cycles (daily loop) |
| `pnpm flow:ci` | fast set + build + AI governance check |
| `pnpm flow:ci:full` | default + accessibility (Pa11y/Lighthouse) + bundle analyze + docker |
| `pnpm flow:ci:docker` | also build the Docker image |
| `pnpm flow:ci:act` | replay the GitHub Actions workflow locally (needs Docker) |
| `pnpm flow:a11y` | accessibility audit (skips with guidance if tooling absent) |
| `pnpm flow:ai-pr-check` | secrets/cross-variant/boundaries (blocking) + advisory warnings |
| `pnpm flow:ops:test` | tests for observability + feature-ops |

## Audit (existing, extended)

| Command | What it does |
| --- | --- |
| `pnpm audit:flow:boundaries` | dependency-cruiser (incl. observability + feature-ops rules) |
| `pnpm audit:flow:cycles` | madge cycle check (incl. observability + feature-ops) |
| `pnpm analyze:flow` | ANALYZE build -> `docs/audit/flow/bundle-stats.after.*` |
| `pnpm exec nx run flow-app:docker-build --skip-nx-cache` | multi-stage Docker image |

## Real vs alias

Real Node scripts (`scripts/flow/*.mjs`): `doctor`, `onboard`, `ci` (+ `--fast/--full/--docker`),
`a11y`, `ai-pr-check`. The rest are thin `package.json` aliases over Nx / pnpm.
