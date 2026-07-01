# @signalops/flow-feature-signals

> The `/signals` Signals Explorer screen. Part of the **Flow** variant (`packages/flow/*`).

Filter bar, the virtualized dense table (TanStack Table + Virtual, 10k+ rows), server
sort + pagination, multi-select and bulk actions (Assign selected / Mark as triaged) with a visible
local effect. URL search state is owned by the app and passed via `search` + `onSearchChange`.

## Commands

```bash
pnpm nx run flow-feature-signals:typecheck
pnpm nx run flow-feature-signals:test
pnpm nx run flow-feature-signals:lint
pnpm nx run flow-feature-signals:build
```

See [`docs/flow/architecture.md`](../../../docs/flow/architecture.md) for the
package's place in the dependency graph and the boundaries enforced around it.
