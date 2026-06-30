# Flow v2 — final report

Transformation of **Variant B — Flow** into a demonstrable, defensible DX reference. Product
contract, routes, data model, design and `docs/product/` are unchanged; only architecture, tooling,
packaging, boundaries, tests, CI and the bundle were touched.

---

## 1. Official docs consulted

| Topic                                                  | Source                                                                             |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Nx project graph / `nx graph --file`                   | nx.dev/docs/features/explore-graph, /nx-api/nx/documents/dep-graph                 |
| `nx affected`, `defaultBase`                           | nx.dev/docs/features/ci-features/affected                                          |
| `@nx/vite` plugin (also infers Vitest `test`)          | nx.dev/docs/technologies/build-tools/vite, /test-tools/vitest                      |
| `@nx/js/typescript` plugin + sync generator            | nx.dev/docs/technologies/typescript, /concepts/sync-generators                     |
| `@nx/enforce-module-boundaries` (ESLint)               | nx.dev/docs/technologies/eslint/eslint-plugin/guides/enforce-module-boundaries     |
| TS project references with Nx                          | nx.dev/docs/technologies/typescript/guides/switch-to-workspaces-project-references |
| pnpm workspaces + catalogs                             | pnpm.io/workspaces, pnpm.io/catalogs                                               |
| TanStack Start server routes + **server-only**         | tanstack.com/start/.../guide/server-routes, /guide/environment-functions           |
| TanStack Router generated route tree / cycle           | github.com/TanStack/router (routeTree.gen.ts), issue #2755                         |
| rolldown-vite + `manualChunks`                         | vite.dev/guide/rolldown, rollupjs.org/configuration-options/#output-manualchunks   |
| rollup-plugin-visualizer (`raw-data`, gzip/brotli)     | github.com/btd/rollup-plugin-visualizer                                            |
| Vitest 4 `test.projects` (replaces `vitest.workspace`) | vitest.dev/guide/projects, /guide/migration.html                                   |
| jsdom/happy-dom env + jest-dom + coverage v8           | vitest.dev/guide/environment, /guide/coverage; github.com/testing-library/jest-dom |
| dependency-cruiser rules + TS resolution               | github.com/sverweij/dependency-cruiser (rules-/options-/cli-reference)             |
| Multi-stage pnpm Docker (`deploy --prod`, non-root)    | pnpm.io/docker, pnpm.io/cli/deploy, docs.docker.com/build/.../best-practices       |

Key correction from the research: **`@tanstack/react-start/server-only` IS a real side-effect
marker subpath** in the installed `1.168.26` (the import-protection plugin strips marked modules from
the client); `@nx/vitest` does **not** exist (Vitest is inferred by `@nx/vite`); the visualizer JSON
template is `raw-data` (not `json`); `vitest.workspace.ts` is deprecated in favour of `test.projects`.

## 2. Packages created / migrated → `packages/flow/*`

Migrated (with relative paths + Nx targets + TS refs fixed):

- `packages/flow-domain` → `packages/flow/domain` (`@signalops/flow-domain`, unchanged name) — added `format/date`, `time/reference`.
- `packages/flow-data-access` → `packages/flow/server-data-access` (**renamed** `@signalops/flow-server-data-access`).
- `packages/flow-ui` → `packages/flow/ui` (`@signalops/flow-ui`) — added `QueryState`, `downloadTextFile`.

Created:

- `@signalops/flow-api-client` — typed fetch + Query hooks + **client demo controls**.
- `@signalops/flow-feature-{dashboard,signals,signal-detail,incidents,compare,dx-metrics,settings}` — one package per screen.

Every package has `package.json`, `project.json`, `tsconfig.json` (composite), `vitest.config.ts`,
`src/index.ts`, a README, Nx tags and explicit TS references. `apps/flow-app` is now thin: routes
(pages + `/api`), the `AppShell` composition, providers, config and the `server/respond` helper.

## 3. New Nx graph (`pnpm nx graph` → `nx-project-graph.clean.html`)

```
flow-app → 7×flow-feature-* · flow-ui · flow-api-client · flow-server-data-access · contracts · ui-spec · test-scenarios
flow-feature-*           → flow-ui · flow-api-client · flow-domain* · contracts     (*settings: no domain)
flow-api-client          → contracts
flow-server-data-access  → flow-domain · contracts · fixtures
flow-domain              → contracts
flow-ui                  → contracts · ui-spec
```

17 projects (11 Flow + app + 5 shared). Acyclic, one-directional. This is exactly the target graph.

## 4. TypeScript project references

Every Flow package is `composite: true` + `declaration` + `declarationMap`, lists explicit
`references`, and excludes test files from the lib build (`tsconfig.lib`-style). `tsc -b` builds the
full graph in dependency order; each package type-checks in isolation. `pnpm nx run-many -t typecheck`
and `flow-app:typecheck` (+ 15 deps) both pass.

## 5. Plugins (Nx / Vite / Vitest / JS)

- **Vite**: `tanstackStart()` + `@vitejs/plugin-react` + `rollup-plugin-visualizer` (analyze).
- **Vitest 4**: per-project configs + a root `test.projects` config for the workspace coverage run.
- **Nx targets**: kept **explicitly declared** (`nx:run-commands`) with `dependsOn`, `inputs`,
  `outputs`, `cache` and `tags`. Inferred plugins (`@nx/vite/plugin`, `@nx/js/typescript`) were
  evaluated and **not** adopted this pass: the explicit targets are deterministic and already drive
  a correct cache + `affected`, and mixing inferred + explicit risks duplicate/blurred targets on a
  reference variant. `@nx/js`/`@nx/vite` adoption (incl. the project-reference sync generator) is a
  documented, low-risk follow-up.

## 6. Boundary checks

`.dependency-cruiser.cjs` + `pnpm audit:flow:boundaries` — 16 rules (client→server, →fixtures,
ui→api-client, domain purity, shared→flow, cross-variant, no-circular). Chose dependency-cruiser over
`@nx/enforce-module-boundaries` because the repo uses **Oxlint, not ESLint**. Plus Nx tags + TS
references as two more enforcement layers. Result: **0 violations (350 modules, 684 deps)**. Wired
into both CI jobs.

## 7. Client / server correction (the headline)

Before: the client chunk `assets/router-*.js` carried `fixtures/{generate,constants,random}.ts` +
`flow-data-access` services. After: `routes/api/*` are marked `import '@tanstack/react-start/server-only'`
and `server/respond.ts` is duck-typed free of the server package, so the import-protection plugin
strips all server code from the **client** build. **Verified**: `dist/client/**` has **0**
occurrences of `generateAll`/`querySignals`/`parseSignalsQuery`/`readFileSync`/`ApiErrorException`/
`DX_METRICS_SEED`, and the module→bundle map puts every fixtures/server module in `dist/server` only.

## 8. Vitest correction

Root `vitest.config.ts` with `test.projects` gives each project its own environment (happy-dom for
React, node for domain/server/shared). The previous global `vitest run --coverage` "document is not
defined" is gone. Shared packages got their own node configs so per-package `vitest run` no longer
walks up to the root projects config. `pnpm exec vitest run --coverage --coverage.provider=v8` →
**28 files, 135 tests pass**, v8 coverage report produced.

## 9. Madge cycle correction

`pnpm audit:flow:cycles` runs Madge over all hand-written Flow source excluding `routeTree\.gen\.ts`
(the by-design TanStack generated cycle). Result: **No circular dependency found** (184 files). See
`route-tree-cycle-note.md`.

## 10. UI features made functional

See `feature-completeness-report.md`. Highlights: Overview Export (JSON) + Refresh + clickable rows;
Signals Assign/Mark-as-triaged with **visible table effect**; Signal-detail Assign/Change-status/
Escalate/Resolve update the badges/tiles; Incidents filters + reset + linked-signal links; Compare
selector/re-run; DX Metrics CSV/JSON export; Settings demo controls that **really** slow / fail every
widget. No silent decorative buttons remain.

## 11–13. Bundle analysis (before/after, applied, refused)

See `bundle-optimization-report.md`. Client download **169 KiB gzip** (entry = React+TanStack vendor,
inherent to the stack; routes split, Table/Virtual lazy on `/signals`). Tree-shaking verified (the
`flow-ui` barrel does not bloat route chunks). A manual `vendor` split was **implemented, measured,
and reverted** (it made Table/Virtual eager on every route). The combined client+server visualizer
total rose (335→485 KiB) only because the SSR **server** bundle now openly carries server-data-access

- fixtures — the user-facing client is cleaner.

## 14. Docker

`pnpm nx run flow-app:docker-build` → image `signalops-flow:local` (587 MB, `node:22-slim`,
multi-stage, non-root `node`, `pnpm deploy --prod` resolving all 11 Flow packages, HEALTHCHECK).
Container verified: `/api/health` → `{"status":"ok",…,"variant":"Variant B — Flow"}`;
`/api/signals?severity=critical` → 817 critical, correctly filtered. `distroless` deliberately
avoided (debuggability).

## 15. CI

`flow-ci.yml`: PR job runs `nx affected -t lint typecheck test build` + boundaries + cycles +
metrics; main job runs `nx run-many` + boundaries + cycles + Docker + metrics. No `continue-on-error`,
no silent checks. `nx-set-shas` derives base/head.

## 16. Commands run & results

| Command                                                           | Result                                       |
| ----------------------------------------------------------------- | -------------------------------------------- |
| `pnpm install`                                                    | ✓ relinked 17 projects                       |
| `pnpm fixtures:generate`                                          | ✓ 10k signals / 300 incidents / 50k events   |
| `pnpm nx graph --file=…clean.html`                                | ✓ generated                                  |
| `pnpm audit:flow:cycles`                                          | ✓ no circular dependency                     |
| `pnpm audit:flow:boundaries`                                      | ✓ 0 violations (350 modules)                 |
| `pnpm nx run-many -t lint typecheck test build` (no cache)        | ✓ 17/17                                      |
| `pnpm exec vitest run --coverage --coverage.provider=v8`          | ✓ 135 tests, coverage OK                     |
| `pnpm metrics:collect`                                            | ✓ results/\*.json (source=seed)              |
| `pnpm analyze:flow`                                               | ✓ bundle-stats.after.{html,json,md}          |
| `pnpm nx affected -t … --base=HEAD~1 --head=HEAD --skip-nx-cache` | ✓ 17/17                                      |
| `pnpm nx run flow-app:docker-build`                               | ✓ image built + health verified              |
| each `flow-*:typecheck`                                           | ✓ (covered by run-many + flow-app:typecheck) |

## 17. Results summary

Graph rich + acyclic; `tsc -b` green; 0 boundary violations; 0 cycles; 135 tests pass with correct
per-project environments; client bundle free of server/fixtures; Docker deployable + health-checked;
CI gates on boundaries + cycles.

## 18. Remaining limits

1. Mutations (assign/status/bulk) are local/optimistic — dataset is read-only by contract.
2. Signals bulk-action and Signal-detail **component** tests are absent (need a TanStack Router test
   harness); their pure logic (`toSignalsQuery`, `nextStatus`, `filterIncidents`) and the data layer
   are unit-tested.
3. Inferred Nx plugins not adopted (explicit targets kept) — documented follow-up.
4. `/dx-metrics` still shows **seed** values (labelled); replacing with collected timings is the
   measurement pass.
5. Entry chunk size is the inherent React+TanStack vendor — not reducible without changing the stack.

## 19. Is Flow v2 ready to be the reference for Friction and Overfit?

**Yes.** Flow now demonstrates, measurably and defensibly: a rich, lisible, acyclic Nx graph; a
feature-package decomposition; strict, enforced client/server + layer boundaries; project-reference
TypeScript that builds with `tsc -b`; reliable per-environment tests with working coverage; a CI that
is fast (`affected`) yet gates on lint/typecheck/test/build/boundaries/cycles with no
`continue-on-error`; a client bundle proven free of server logic and fixtures; and a deployable,
health-checked Docker image. It is the balanced baseline against which Friction's neglected DX and
Overfit's over-engineering can be fairly compared.

## 20. Effect TS integration pass (addendum)

A later pass introduced **Effect TS** at Flow's data edges — strong in `server-data-access`, useful
in `api-client`, deliberately **absent** from `domain` and `ui`. Full detail, docs consulted and
bundle numbers are in [`effect-integration-report.md`](./effect-integration-report.md). Headlines:

- **New package** `@signalops/flow-effect` (isomorphic; `contracts` + `effect` only): the typed
  `Flow*Error` channel, `makeRequestId()`, and the single `toApiErrorPayload` error → `ApiError` map.
- **server-data-access**: repositories/services are now `Context.Tag` + `Layer` services
  (`Dataset`, `SignalsRepository`, `IncidentsRepository`, `Dashboard/Compare/Metrics/Health`),
  composed into `ServerLive`; `runApiEffect` provides the layer + a request-scoped `RequestContext`
  and maps failures to `ApiError`. Query parsing moved Zod → **Effect Schema**. Pure compute stays
  plain functions.
- **routes**: every `GET /api/*` is now `handleEffect(getXEffect(...))`; the route table, response
  shapes, status codes and `requestId` are unchanged.
- **api-client**: a typed `requestEffect` with bounded network retry + total timeout + AbortSignal,
  still rejecting with the same `ApiRequestError` the UI reads (zero UI change). TanStack Query retry
  set to `false` (Effect owns network retry).
- **Boundaries**: `flow-effect` is held to `contracts` + `effect`; `ui` may import neither the Effect
  runtime nor `flow-effect`. `pnpm audit:flow:boundaries` → 0 violations.
- **Bundle**: +9.17 KiB gzip (entry +3.0, router +6.18); `/signals` `table-core` stays lazy; no
  server/fixtures/Schema/`platform-node` in the browser bundle.
- **Verification**: lint, typecheck, test (across 18 projects), build, metrics, boundaries, cycles,
  `analyze:flow` and the Docker multi-stage build all pass.

This enriches the balanced baseline (typed errors, injectable/testable services, declarative
retry/timeout, runtime validation) without tipping Flow into Overfit.
