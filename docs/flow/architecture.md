# Flow — architecture & boundaries

The canonical description of Flow's package layering and the rules that keep it honest. If you
are moving code between layers, adding an import, or adding a dependency, read this first.

## Layering is enforced three ways

A forbidden edge fails in CI instead of living silently in the graph:

1. **Nx tags** (`project.json` `tags`) — each project's `scope` + `type`.
2. **TypeScript project references** — a package only sees the `.d.ts` of projects it references;
   an unreferenced import does not type-check.
3. **dependency-cruiser** (`.dependency-cruiser.cjs`, via `pnpm audit:flow:boundaries`) — the
   executable rules below. OXC stays the fast everyday linter; dependency-cruiser is the dedicated
   boundary check (we don't pull in ESLint just for `@nx/enforce-module-boundaries`).

## Tag taxonomy

| Project | Tags |
| --- | --- |
| `flow-app` | `scope:flow`, `type:app` |
| `flow-feature-*` (7) | `scope:flow`, `type:feature` |
| `flow-ui` | `scope:flow`, `type:ui` |
| `flow-api-client` | `scope:flow`, `type:api-client` |
| `flow-domain` | `scope:flow`, `type:domain` |
| `flow-effect` | `scope:flow`, `type:effect` (isomorphic) |
| `flow-observability` | `scope:flow`, `type:observability` (framework-free core) |
| `flow-server-data-access` | `scope:flow`, `type:server`, `type:data-access` |
| `contracts` / `fixtures` | `scope:shared` |

## The allowed graph

```
flow-app ─┬─> flow-feature-{dashboard,signals,signal-detail,incidents,compare,dx-metrics,settings,ops}
          ├─> flow-ui · flow-api-client · flow-observability · contracts · ui-spec
          └─> flow-server-data-access   (ONLY via routes/api + server/)

flow-feature-*  ─> flow-ui · flow-api-client · flow-domain* · flow-observability · contracts
flow-api-client ─> contracts · flow-effect · effect
flow-server-data-access ─> flow-domain · flow-effect · flow-observability · contracts · fixtures · effect
flow-observability ─> contracts   (+ npm `effect` only inside effect.ts)
flow-effect     ─> contracts · effect            (isomorphic; server + client)
flow-domain     ─> contracts                     (Effect deliberately refused here)
flow-ui         ─> contracts · ui-spec           (no data layer, no Effect, no observability)
```

`flow-effect` is the only package imported by both a server and a client layer, so it is held to
`contracts` + `effect` only — keeping the wire-error contract isomorphic and the client bundle honest.
The **server is reachable only from `apps/flow-app/src/routes/api/` and `apps/flow-app/src/server/`** —
never from a feature, the UI, or the API client. That is what keeps server logic and fixtures out
of the client bundle.

## Enforced forbidden edges

Run `pnpm audit:flow:boundaries` (dependency-cruiser) and `pnpm audit:flow:cycles` (madge). Key rules:

- `no-feature-to-server`, `no-ui-to-server`, `no-apiclient-to-server`, `no-app-client-to-server` —
  only `routes/api/` + `server/` may reach `flow-server-data-access`.
- `no-*-to-fixtures` — ui / api-client / feature / domain never import `fixtures`.
- `no-ui-to-apiclient` — UI is data-agnostic; data arrives via props.
- `no-domain-to-react` / `-tanstack` / `-ui` / `-fixtures` — domain stays pure.
- `no-flow-effect-to-framework` / `no-flow-effect-to-siblings` — flow-effect stays isomorphic & thin.
- `no-ui-to-effect-runtime` / `no-ui-to-flow-effect` / `no-ui-to-observability` — UI stays lean.
- `no-observability-to-framework` / `-siblings` / `-app`, `no-observability-core-to-effect` — the
  observability core is framework-free; the Effect logger adapter (`effect.ts`) is server-only.
- `no-shared-to-flow`, `no-cross-variant` (flow ↔ friction/overfit), `no-circular`
  (generated `routeTree.gen.ts` excepted — see below).

## Effect placement

Effect TS is accepted **only where it lowers delivery cost**, not as a default:

- `server-data-access` — good fit (IO, typed error channels, resource/scope management).
- `api-client` — acceptable (request orchestration, typed errors).
- `domain` — keep it light; pure functions must not require Effect.
- `ui` / `observability core` — none; the Effect logger adapter is isolated to `effect.ts` and
  loaded server-side only, so it never reaches the client bundle.

## Why `routeTree.gen.ts` is excepted from the cycle check

TanStack Router generates `routeTree.gen.ts`, which imports route files that import it back — a
by-design cycle in generated code. It is excluded in `.dependency-cruiser.cjs` and the madge command;
no hand-written cycle is allowed.

## Verify after any structural change

```bash
pnpm audit:flow:boundaries   # forbidden edges → 0 violations
pnpm audit:flow:cycles       # circular deps → none
```
