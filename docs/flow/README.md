# Flow — engineering docs

Canonical documentation for the **Flow** variant (Variant B). One topic, one document. For the
product contract and measurement protocol see `docs/product/` (do not duplicate them here).

| Doc | When to reach for it |
| --- | --- |
| [local-development.md](local-development.md) | Onboard, run the app, add a UI component / API route / feature |
| [quality-gates.md](quality-gates.md) | Reproduce CI, check the bundle, accessibility, security |
| [debugging-and-ops.md](debugging-and-ops.md) | Debug errors, correlate a request id, release & roll back |
| [ai-governance.md](ai-governance.md) | Use AI on a Flow PR safely; the AI PR manifest |
| [architecture.md](architecture.md) | Package layering and the enforced boundary rules |

## Command reference

One command, one intention. All scoped to Flow.

**Onboard & environment**

| Command | What it does |
| --- | --- |
| `pnpm flow:doctor` | Check Node ≥ 20.11, pnpm, lockfile, node_modules, fixtures, docker/act |
| `pnpm flow:onboard` | doctor + fixtures + next steps (never auto-installs) |
| `pnpm flow:setup` | `pnpm install && pnpm fixtures:generate` |

**Develop**

| Command | What it does |
| --- | --- |
| `pnpm flow:dev` | Start the app at http://localhost:3000 |
| `pnpm flow:dev:clean` | Clear `.output`/`dist`, then start |
| `pnpm build:flow` | Build the app (regenerates `routeTree.gen.ts`) |

**Verify**

| Command | What it does |
| --- | --- |
| `pnpm flow:ci:fast` | lint + typecheck + tests + boundaries + cycles (daily loop) |
| `pnpm flow:ci` | fast set + build + AI governance check |
| `pnpm flow:ci:full` | + accessibility + bundle analyze + docker |
| `pnpm flow:ci:act` | replay the GitHub Actions workflow locally (needs Docker) |
| `pnpm flow:a11y` | accessibility audit (skips with guidance if tooling absent) |
| `pnpm flow:ai-pr-check` | secrets / cross-variant / boundaries (blocking) + warnings |
| `pnpm flow:ops:test` | tests for observability + feature-ops |

**Audit**

| Command | What it does |
| --- | --- |
| `pnpm audit:flow:boundaries` | dependency-cruiser (incl. observability + feature-ops rules) |
| `pnpm audit:flow:cycles` | madge cycle check |
| `pnpm analyze:flow` | ANALYZE build → bundle stats under `docs/audit/flow/` (git-ignored) |
| `pnpm exec nx run flow-app:docker-build --skip-nx-cache` | multi-stage Docker image |

Real Node scripts live in `scripts/flow/*.mjs` (`doctor`, `onboard`, `ci`, `a11y`, `ai-pr-check`);
the rest are thin `package.json` aliases over Nx / pnpm. Generated audit artifacts are **not**
versioned — regenerate them locally with the commands above.
