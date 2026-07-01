# Flow — architecture boundaries

Flow's layering is enforced by **three independent mechanisms**, so a forbidden edge fails in CI
rather than living silently in the graph:

1. **Nx tags** (`project.json` `tags`) — describe each project's `scope` + `type`.
2. **TypeScript project references** — a package can only see the `.d.ts` of projects it explicitly
   references; an unreferenced import does not type-check.
3. **dependency-cruiser** (`.dependency-cruiser.cjs`, run via `pnpm audit:flow:boundaries`) — the
   executable architecture rules below. OXC stays the fast everyday linter; dependency-cruiser is
   the dedicated boundary check (we do not pull in ESLint just for `@nx/enforce-module-boundaries`).

## Tag taxonomy

| Project                   | Tags                                            |
| ------------------------- | ----------------------------------------------- |
| `flow-app`                | `scope:flow`, `type:app`                        |
| `flow-feature-*` (7)      | `scope:flow`, `type:feature`                    |
| `flow-ui`                 | `scope:flow`, `type:ui`                         |
| `flow-api-client`         | `scope:flow`, `type:api-client`                 |
| `flow-domain`             | `scope:flow`, `type:domain`                     |
| `flow-effect`             | `scope:flow`, `type:effect` (isomorphic)        |
| `flow-server-data-access` | `scope:flow`, `type:server`, `type:data-access` |
| `contracts`               | `scope:shared`, `type:contracts`                |
| `fixtures`                | `scope:shared`, `type:fixtures`                 |

## The allowed graph

```
flow-app ─┬─> flow-feature-{dashboard,signals,signal-detail,incidents,compare,dx-metrics,settings}
          ├─> flow-ui · flow-api-client · contracts · ui-spec
          └─> flow-server-data-access   (ONLY via routes/api + server/)

flow-feature-*  ─> flow-ui · flow-api-client · flow-domain* · contracts   (*settings: no domain)
flow-api-client ─> contracts · flow-effect · effect
flow-server-data-access ─> flow-domain · flow-effect · contracts · fixtures · effect
flow-effect     ─> contracts · effect            (isomorphic; server + client)
flow-domain     ─> contracts                     (Effect deliberately refused here)
flow-ui         ─> contracts · ui-spec           (no Effect runtime, no flow-effect)
```

`flow-effect` is the only package imported by both a server layer and a client layer, so it is held
to `contracts` + `effect` only — keeping the wire-error contract isomorphic and the client bundle
honest.

This is exactly what `pnpm nx graph` renders (see `nx-project-graph.clean.html`) and what
`source-dependency-graph.clean.svg` shows at the file level.

## Enforced forbidden edges (`pnpm audit:flow:boundaries`)

| Rule                          | Forbids                                                              |
| ----------------------------- | -------------------------------------------------------------------- |
| `no-feature-to-server`        | feature → `flow-server-data-access`                                  |
| `no-ui-to-server`             | ui → `flow-server-data-access`                                       |
| `no-apiclient-to-server`      | api-client → `flow-server-data-access`                               |
| `no-app-client-to-server`     | app client code (anything but `routes/api/`, `server/`) → server     |
| `no-ui-to-fixtures`           | ui → `fixtures`                                                      |
| `no-apiclient-to-fixtures`    | api-client → `fixtures`                                              |
| `no-feature-to-fixtures`      | feature → `fixtures`                                                 |
| `no-ui-to-apiclient`          | ui → `flow-api-client` (UI is data-agnostic; data via props)         |
| `no-domain-to-react`          | domain → react / react-dom                                           |
| `no-domain-to-tanstack`       | domain → `@tanstack/*`                                               |
| `no-domain-to-ui`             | domain → ui                                                          |
| `no-domain-to-fixtures`       | domain → fixtures                                                    |
| `no-server-to-react`          | server-data-access → react                                           |
| `no-flow-effect-to-framework` | flow-effect → react / react-dom / `@tanstack/*`                      |
| `no-flow-effect-to-siblings`  | flow-effect → fixtures / server / api-client / ui / domain / feature |
| `no-ui-to-effect-runtime`     | ui → the Effect runtime (npm `effect`)                               |
| `no-ui-to-flow-effect`        | ui → `flow-effect`                                                   |
| `no-shared-to-flow`           | shared socle → any `packages/flow/*`                                 |
| `no-cross-variant`            | flow ↔ friction / overfit                                           |
| `no-circular`                 | any circular dependency (generated route tree excluded)              |

## Result

```
✔ no dependency violations found (376 modules, 825 dependencies cruised)
```

All boundaries hold. Notably, the **server is reachable only from `apps/flow-app/src/routes/api/`
and `apps/flow-app/src/server/`** — never from a feature, the UI, or the API client — which is what
keeps server logic and fixtures out of the client bundle.

## Run / observability pass (addendum)

Two packages were added — `@signalops/flow-observability` (framework-free core + an isolated `./effect`
adapter) and `@signalops/flow-feature-ops` (the `/ops` screen) — with new enforced edges:

| Rule                             | Forbids                                                            |
| -------------------------------- | ----------------------------------------------------------------- |
| `no-observability-to-framework`  | observability → react / react-dom / `@tanstack/*`                 |
| `no-observability-to-siblings`   | observability → fixtures / ui / server / api-client / feature     |
| `no-observability-to-app`        | observability → the app                                           |
| `no-observability-core-to-effect`| observability core (all but `effect.ts` + tests) → Effect runtime |
| `no-ui-to-observability`         | ui → `flow-observability` (UI stays data-agnostic)                |

Allowed: observability → `contracts` (+ `effect` only in `effect.ts`); server-data-access, api-client,
features and the app → observability; feature-ops → ui · api-client · observability · contracts.

This keeps the Effect logger adapter server-only (out of the client bundle) and the observability core
framework-free. `pnpm audit:flow:boundaries` → 0 violations (446 modules, 1027 dependencies); cycles clean.
