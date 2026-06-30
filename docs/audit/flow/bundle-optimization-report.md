# Flow v2 — bundle optimization report

Generated with `rollup-plugin-visualizer` via `pnpm analyze:flow`
(`ANALYZE=true nx run flow-app:build`). Raw data: `bundle-stats.after.json`; treemap:
`bundle-stats.after.html`; module table: `bundle-stats.after.md`.

## Headline result

**Server logic and fixtures are now completely absent from the client bundle.**

Before this pass, the client chunk `assets/router-*.js` contained:

- `packages/fixtures/src/generate.ts` (5.17 KiB), `constants.ts` (4.79 KiB), `random.ts` (1.94 KiB)
- `packages/flow-data-access/src/services/compare-service.ts`, `api-errors/api-error.ts`,
  `query/parse.ts`, `config.ts`

i.e. the deterministic 10k-row dataset generator and the server repositories/services were shipped
to the browser. After this pass, a grep of `apps/flow-app/dist/client/**` finds **0** occurrences of
`generateAll`, `querySignals`, `parseSignalsQuery`, `readFileSync`, `node:crypto`,
`ApiErrorException`, `DX_METRICS_SEED` or `buildDashboardSummary`, and the module-to-bundle map in
`bundle-stats.after.json` shows every `fixtures` / `server-data-access` module living **only** in the
server bundle (`dist/server/assets/router-*.js`).

### How

- `flow-server-data-access` is a strictly server package; the only modules that import it are
  `apps/flow-app/src/routes/api/*` and `apps/flow-app/src/server/respond.ts`.
- Each `routes/api/*.ts` file is marked with `import '@tanstack/react-start/server-only'`. TanStack
  Start's import-protection plugin replaces server-only modules with an empty virtual module in the
  **client** build, so the static import chain `api route → server-data-access → fixtures` is cut on
  the client while remaining intact on the server.
- `server/respond.ts` was made dependency-free of `server-data-access` (it duck-types the
  `ApiErrorException` envelope) so it carries no server code even though it is referenced by the
  route tree.
- `dependency-cruiser` (`pnpm audit:flow:boundaries`) enforces that no feature / UI / api-client /
  app-client module ever imports `server-data-access` or `fixtures`.

## Before / after (same tool, `visualizer` totals — client + server combined)

| Metric (combined client+server) |    Before |     After |
| ------------------------------- | --------: | --------: |
| Rendered                        | 335.7 KiB | 485.0 KiB |
| Gzip                            | 118.0 KiB | 152.0 KiB |
| Brotli                          | 101.3 KiB | 130.5 KiB |
| Modules                         |       193 |       213 |

The combined total **grew**, and that is expected and correct: the SSR **server** bundle now openly
carries its own full copy of `server-data-access` + `fixtures` + every route (server-rendered),
instead of those modules being smuggled into a shared/client chunk and counted once. The finer
package split (11 `packages/flow/*` packages) also adds module-wrapper overhead. **The combined
figure is not the user-facing metric** — the client download is.

## What the browser actually downloads (client only, measured on disk)

| Client asset (`dist/client/assets`) |         Raw |        Gzip | Notes                                                                           |
| ----------------------------------- | ----------: | ----------: | ------------------------------------------------------------------------------- |
| `index-*.js` (entry / "main chunk") |     448 KiB |     136 KiB | React 19 + TanStack Router/Query/Start runtime + app shell + home route         |
| `signals-*.js`                      |      77 KiB |      21 KiB | TanStack **Table + Virtual** + Signals Explorer — loaded **only** on `/signals` |
| `dx-metrics-*.js`                   |     7.8 KiB |     2.9 KiB | route-lazy                                                                      |
| `_id-*.js` (signal detail)          |     5.8 KiB |     2.2 KiB | route-lazy                                                                      |
| `routes-*.js`                       |     4.3 KiB |     1.7 KiB | route-lazy                                                                      |
| `incidents-*.js`                    |     3.7 KiB |     1.4 KiB | route-lazy                                                                      |
| `settings-*.js`                     |     3.5 KiB |     1.4 KiB | route-lazy                                                                      |
| `compare-*.js`                      |     1.6 KiB |     0.8 KiB | route-lazy                                                                      |
| **Client JS total**                 | **553 KiB** | **169 KiB** |                                                                                 |
| Client CSS total                    |      31 KiB |     8.8 KiB | per-route CSS modules                                                           |

The entry chunk is dominated by the **React + TanStack vendor core** (inherent to the chosen stack,
which the product contract fixes — not reducible without changing the stack). Everything else is
**route-level split** by TanStack Router and loaded on demand.

## Optimizations applied / verified

- **Server + fixtures stripped from the client** (the main win, verified above).
- **Route-level code splitting preserved** — each of the 7 screens is its own client chunk;
  TanStack Table + Virtual ship only in the `/signals` chunk, not the entry.
- **Tree-shaking verified across the `flow-ui` barrel** — the client `signals` chunk contains
  _none_ of `TrendChart` / `VariantBars` / `MetricsTable` / `ComparePanel` / `SeverityBars` /
  `StatusList` (it imports only what it uses). The barrel does **not** bloat route chunks, so it was
  kept (no need to replace it with deep imports).
- **Zod kept server-side where possible** — the query-parsing schemas in `server-data-access`
  (`parse.ts`) are stripped from the client; the only Zod left in the client is the route
  `validateSearch` schema, which legitimately runs in the browser.
- **`lodash-es` is not imported anywhere in Flow** — no wholesale-lodash risk to police.
- **Charts are lightweight inline SVG/CSS** (no chart library), so lazy-loading them would add
  indirection for no payload win — deliberately not done.

## Optimizations evaluated and **refused**

- **Manual `vendor` chunk split** (`build.rollupOptions.output.manualChunks`). Implemented and
  measured: it shrank the entry chunk but forced **all** of `@tanstack` — including Table + Virtual —
  into a single always-loaded `vendor-tanstack` chunk (96 KiB gzip), making the heavy table libs
  **eager on every route** (they are route-lazy by default). That is a net regression for the home /
  incidents / settings pages, which don't use a virtualized table. **Reverted** — TanStack Router's
  automatic route splitting is left in charge. (A finer split that keeps Table/Virtual lazy was
  judged too fragile against the Start SSR manifest for the payoff.)
- **`distroless` runtime image** — rejected per the brief (`node:22-slim` keeps the image debuggable;
  see Docker section of the final report).

## Risks / remaining limits

- The entry chunk (136 KiB gzip) is essentially the React + TanStack runtime; it cannot shrink
  without changing the stack, which the product contract forbids. This is the deliberate Flow
  trade-off: a slightly larger vendor core buys a dramatically lower **cost of change** (the
  comparison Overfit/Friction are measured against).
- The combined client+server visualizer total is not a transfer metric; the per-asset client table
  above is the number to quote at the defense.
