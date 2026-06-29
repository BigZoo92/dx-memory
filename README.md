# SignalOps DX Lab

> Shared monorepo foundation for **SignalOps**, a fictional B2B SaaS dashboard built three times to
> demonstrate how Developer Experience decisions change the **total cost of delivery** — without
> changing the product the user sees.

This repository is the support material for a thesis defense. It hosts **one product, three
implementations**:

| Variant          | Theme           | Intent                                                 |
| ---------------- | --------------- | ------------------------------------------------------ |
| **A — Friction** | neglected DX    | functional, but costly to build, ship, run and change  |
| **B — Flow**     | balanced DX     | clarity, fast feedback loops, low cost of change       |
| **C — Overfit**  | over-engineered | technically serious but high cognitive & delivery cost |

## Why three variants?

The comparison only means something if it is **fair**. The three variants must implement the _exact
same product_: same routes, same screens, same data, same UI states, same acceptance criteria. The
only visible difference allowed is the variant badge.

To guarantee that fairness, everything the variants must share lives in `packages/*` and is consumed
identically by all three. The variants may only differ in **architecture, tooling, framework,
backend, CI, Docker, error-handling and documentation** — never in product behavior.

See [`docs/product/00-product-contract.md`](docs/product/00-product-contract.md) for the binding
contract.

## What this pass delivers (the socle)

This pass builds **only the shared foundation** — not the three applications. Concretely:

- a pnpm + Nx + TypeScript monorepo;
- five shared packages (`contracts`, `fixtures`, `metrics`, `test-scenarios`, `ui-spec`);
- a deterministic fixture generator (10k signals, 300 incidents, 50k events, …);
- a metrics collector that reads a seed and writes comparable results;
- engineering docs, GitHub Actions skeletons and Docker folder skeletons;
- `apps/*` placeholders describing the planned stack for each variant.

The applications themselves come in later, variant-specific passes.

## Repository layout

```txt
apps/                 # variant placeholders (no implementation yet)
  friction-web/  friction-api/  flow-app/  overfit-web/  overfit-api/
packages/             # shared source of truth — consumed identically by all variants
  contracts/          # @signalops/contracts   — types & API contracts
  fixtures/           # @signalops/fixtures    — deterministic dataset generator
  metrics/            # @signalops/metrics     — DX metrics collection
  test-scenarios/     # @signalops/test-scenarios — common user scenarios
  ui-spec/            # @signalops/ui-spec     — typed design tokens, routes, screens
docs/
  product/            # binding product contract & specs (do not edit in this pass)
  engineering/        # how the repo works (this pass)
docker/               # per-variant Docker skeletons
.github/workflows/    # CI skeletons (friction / flow / overfit / metrics)
maquettes/            # clickable design reference (do not move or delete)
```

## Requirements

- Node.js ≥ 20.11 (tested on Node 22)
- pnpm ≥ 9 (`corepack enable` or install pnpm globally)

## Getting started

```bash
# 1. Install dependencies
pnpm install

# 2. Generate the shared dataset (deterministic, no network)
pnpm fixtures:generate

# 3. Type-check every shared package
pnpm typecheck

# 4. Run the shared package tests
pnpm test

# 5. Collect DX metrics into a results file
pnpm metrics:collect      # or: pnpm metrics:all  (fixtures + metrics)
```

Other useful scripts:

```bash
pnpm build          # nx run-many -t build  (type-only build for source packages)
pnpm lint           # nx run-many -t lint   (prettier check per package)
pnpm format         # prettier --write .
```

## Generated artifacts

Some files are produced by scripts and intentionally **git-ignored**:

- `packages/fixtures/data/*.json` — the dataset (`pnpm fixtures:generate`)
- `packages/metrics/results/*.json` — collected metrics (`pnpm metrics:collect`)

A committed `packages/metrics/results/results.example.json` shows the expected shape.

## Documentation

| Doc                                                                                | Purpose                             |
| ---------------------------------------------------------------------------------- | ----------------------------------- |
| [docs/engineering/00-repo-overview.md](docs/engineering/00-repo-overview.md)       | How the monorepo fits together      |
| [docs/engineering/01-local-setup.md](docs/engineering/01-local-setup.md)           | Local setup & common commands       |
| [docs/engineering/02-shared-contracts.md](docs/engineering/02-shared-contracts.md) | The `@signalops/contracts` package  |
| [docs/engineering/03-fixtures.md](docs/engineering/03-fixtures.md)                 | The deterministic fixture generator |
| [docs/engineering/04-metrics.md](docs/engineering/04-metrics.md)                   | The metrics pipeline                |
| [docs/engineering/05-ci-strategy.md](docs/engineering/05-ci-strategy.md)           | CI workflows & measurement          |
| [docs/engineering/06-next-steps.md](docs/engineering/06-next-steps.md)             | What the variant passes will do     |

## Rolldown

The Flow variant builds on **Vite 7** with **Rolldown** enabled via a one-line, reversible pnpm
override in this file:

```jsonc
"pnpm": { "overrides": { "vite": "npm:rolldown-vite@7.3.1" } }
```

`vite` then resolves to `rolldown-vite@7.3.1` everywhere (build, dev, Vitest). It is verified green
(typecheck, tests, build and the Docker image all pass). To fall back to stock Vite 7 (Rollup),
remove the override and `pnpm install` — the app stays green either way. Vite 8 (Rolldown native) was
**not** adopted because TanStack Start has open SSR/server-runtime issues on it as of mid-2026.

## Status

✅ Shared socle. ✅ **Variant B — Flow** (`apps/flow-app` + `packages/flow-*`, see
[apps/flow-app/README.md](apps/flow-app/README.md)). ⏳ Variant A (Friction) and Variant C (Overfit)
— see [docs/engineering/06-next-steps.md](docs/engineering/06-next-steps.md).
