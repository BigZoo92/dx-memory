# flow-app — SignalOps Variant B (Flow)

The **reference** variant: a single full-stack [TanStack Start](https://tanstack.com/start) app
(UI + server API routes) that implements the exact SignalOps product
([`docs/product/00-product-contract.md`](../../docs/product/00-product-contract.md)) with an
architecture optimized for **short feedback loops, low cognitive load and low cost of change**.

> The only visible difference from the other variants is the badge: **Variant B — Flow**.

---

## Stack

| Area       | Choice                                                                             |
| ---------- | ---------------------------------------------------------------------------------- |
| Language   | TypeScript (strict) with **project references** (`composite`)                      |
| Framework  | TanStack **Start** + **Router** (file-based) + **Query** + **Table** + **Virtual** |
| Validation | **Zod** (API query parsing, route search params)                                   |
| Styling    | **CSS Modules** + design tokens as CSS variables                                   |
| Build/dev  | **Vite 7** (Rolldown-capable — see below)                                          |
| Tests      | **Vitest 4** + React Testing Library                                               |
| Lint       | **Oxlint** (TS/TSX/React)                                                          |
| Monorepo   | **Nx** (project graph + `affected` + caching) + **pnpm** workspaces & catalogs     |
| Container  | Multi-stage **Docker** (non-root, prod-only deps)                                  |

Versions are pinned centrally in [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml) catalogs.

## How it was scaffolded

Built following TanStack Start's official **"Build from scratch"** guide
(<https://tanstack.com/start/latest/docs/framework/react/build-from-scratch>): a `vite.config.ts`
using the `tanstackStart()` plugin from `@tanstack/react-start/plugin/vite`, `src/router.tsx`
exporting `getRouter()`, a `src/routes/__root.tsx`, and a generated `src/routeTree.gen.ts`. The
interactive `@tanstack/cli create` scaffold was intentionally **not** used — it generates its own
lockfile/config and doesn't integrate cleanly into an existing pnpm-catalog + Nx workspace.

## Commands

```bash
pnpm --filter @signalops/flow-app dev             # vite dev server (http://localhost:3000)
pnpm --filter @signalops/flow-app build           # production build → dist/
pnpm --filter @signalops/flow-app start           # serve the built app (node server.mjs)
pnpm --filter @signalops/flow-app typecheck       # tsc -p tsconfig.json --noEmit
pnpm --filter @signalops/flow-app test            # vitest run
pnpm --filter @signalops/flow-app lint            # oxlint src
pnpm --filter @signalops/flow-app metrics:collect # measure the built bundle → metrics.flow.json

# Nx equivalents (graph-aware, cached):
pnpm nx run flow-app:dev
pnpm nx run flow-app:build
pnpm nx run flow-app:docker-build
```

## Architecture

```
apps/flow-app/src
  routes/            file-based routes (pages + /api server routes) — thin, delegate to features
    api/             GET/POST server handlers → @signalops/flow-data-access
  app/               composition: layout (AppShell), providers (QueryClient), config, styles
  features/          one folder per screen (dashboard, signals, incidents, compare, dx-metrics, settings)
  shared/            api client + TanStack Query hooks, QueryState boundary, formatting
  server/            server-route response/error helper
```

Layering (enforced by the Nx graph + TypeScript references):

- **`@signalops/flow-domain`** — pure business logic (severity ranking, confidence, filters,
  stable sort, KPIs, compare deltas, metric axes). No React, no DOM, no TanStack.
- **`@signalops/flow-data-access`** — repositories, Zod parsing, typed `ApiError`, services. Server
  only; no UI.
- **`@signalops/flow-ui`** — reusable React components (CSS Modules). No API access; data via props.
- **`flow-app`** — routes, server API, providers and feature composition.

### Dependency graph

```
flow-app ─┬─> flow-ui ───────> contracts, ui-spec
          ├─> flow-data-access ─> flow-domain, contracts, fixtures
          ├─> flow-domain ─────> contracts
          ├─> contracts
          ├─> ui-spec
          └─> test-scenarios
```

This exact shape is what `pnpm nx graph` renders. It is acyclic and one-directional: domain never
imports UI or a framework, UI never reads fixtures, data-access never imports components, and the
shared socle packages never depend on Flow. That is what makes a change _localizable_.

## DX choices (the point of "Flow")

- **TanStack Start** — one app, one mental model. File-based routes co-locate pages and their
  `/api` server handlers; the same `Signal`/`ApiError` types flow from the server to `useQuery` to
  the component with no codegen and no drift.
- **TanStack Query** — declarative loading/error/cache; a single `QueryState` boundary gives every
  screen consistent loading + global-error + retry handling.
- **TanStack Table + Virtual** — the Signals Explorer manages column/sort/selection state with Table
  and renders only visible rows with Virtual, so it stays smooth over the 10,000-row dataset.
- **Nx** — the project graph is the architecture made executable: `nx affected` runs only what a
  diff touches, `dependsOn: ["^typecheck"]` respects the reference order, and local caching keeps
  the feedback loop short.
- **pnpm catalogs** — one pinned version per dependency, referenced as `catalog:` everywhere — no
  drift, reproducible installs.
- **TypeScript project references** — every package is `composite` and lists explicit `references`;
  each can be type-checked in isolation (`tsc -b`), and the app depends on the packages, never the
  reverse.
- **Oxlint** — fast Rust linter for TS/TSX/React, replacing ESLint. Formatting stays on **Prettier**
  because the OXC formatter (`oxfmt`) is still beta — see below.
- **CSS Modules** — scoped styles next to components; design tokens are CSS variables ported
  verbatim from `@signalops/ui-spec`, so the three variants stay pixel-identical.

## TanStack / Nx / pnpm / TS-references / OXC / Vite-Rolldown decisions

- **TanStack** — Start (full-stack), Router (file-based, typed search params via Zod), Query
  (server-state), Table + Virtual (the 10k-row explorer). **TanStack Form was not adopted**: the
  only forms here are simple controlled inputs (filters, settings toggles, compare selector) where a
  form library would add indirection without improving readability.
- **Nx** — kept at the socle's version (20) to avoid destabilizing the shared packages. Each Flow
  package is a real Nx project (`project.json`) with `typecheck`/`test`/`build`/`lint` (+ `dev`,
  `docker-build`, `metrics` for the app), `dependsOn`, `inputs`/`outputs` and local cache.
- **pnpm** — workspaces + **catalogs** centralize every key version; `--frozen-lockfile` everywhere;
  `packageManager` pins pnpm at the root.
- **TypeScript project references** — `composite: true` + explicit `references` across the whole
  graph (shared packages were made composite too, a non-breaking tooling enablement so `tsc -b`
  works end-to-end).
- **OXC** — `oxlint` for linting; `oxfmt` (beta) deferred, Prettier retained for formatting.
- **Vite / Rolldown** — Vite 7 baseline (Start-compatible); Rolldown opt-in via a one-line pnpm
  override (`rolldown-vite@7.3.1`), reversible — see [root README](../../README.md#rolldown).

## Docker

Multi-stage build — see [`docker/flow/README.md`](../../docker/flow/README.md). The build emits a
Web `{ fetch }` handler (`dist/server/server.js`); `server.mjs` serves it on `PORT` (default 3000)
via `srvx`. Verified locally: the container boots, `/api/health` returns the Flow envelope, and
`/api/signals` filters correctly.

## Routes & API

7 product routes: `/`, `/signals`, `/signals/:id`, `/incidents`, `/compare`, `/dx-metrics`,
`/settings`. 9 server endpoints under `/api`: `health`, `signals`, `signals/:id`,
`signals/:id/events`, `incidents`, `dashboard/summary`, `compare/:id`, `dx-metrics`,
`simulate-error`. Every async surface covers loading / empty / partial-error / global-error /
slow-network / invalid-data / not-found / unauthorized states.

## Remaining limits

- `/dx-metrics` shows **seed** values (clearly labelled `source: seed`); `metrics.flow.json`
  collects the **real** bundle size today. Wiring real timings into the comparison is the
  measurement pass.
- Bulk actions, signal mutations and the "New signal" CTA are mock (read-only dataset), matching the
  reference's demo behavior.
- Assignees render as analyst ids (the contract's `assignedTo`); name resolution is a trivial future
  add (the analysts fixture exists).
- `routeTree.gen.ts` is committed so `typecheck`/CI work without a generate step; `vite build`
  regenerates it.

## Why this is Flow

- **Build fast** — Vite + Oxlint + Nx cache + `affected` keep install/typecheck/test/build short.
- **Ship reliably** — one app, multi-stage Docker, CI that gates on lint/typecheck/test/build with
  no `continue-on-error`.
- **Run legibly** — typed `ApiError` everywhere; every async surface has explicit UI states.
- **Change locally** — the layered graph means a feature touches few files; the shared "Risk trend"
  AI task is designed to ripple minimally here.
- **Helps the AI agent** — clear package boundaries and names give an assistant an obvious place to
  put each change.
