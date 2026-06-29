# 06 — Next steps

The socle is done. The variants come next, one dedicated pass each. Every variant must implement the
**exact same product** (`docs/product/00-product-contract.md`) and may differ only in architecture,
tooling, backend, CI, Docker, error handling and documentation.

## Per-variant checklist (applies to all three)

- [ ] Scaffold the app(s) in `apps/*` with a real `package.json` (becomes an Nx project).
- [ ] Implement the 7 routes / screens from `@signalops/ui-spec` (pixel-identical; only the variant
      badge differs).
- [ ] Build the API from `@signalops/fixtures` honoring `API_ROUTES` + `ApiError`.
- [ ] Cover all 8 async UI states (loading, empty, partial-error, global-error, slow-network,
      invalid-data, not-found, unauthorized).
- [ ] Implement the 10 scenarios from `@signalops/test-scenarios` in the variant's test stack.
- [ ] Wire `build` / `test` / `typecheck` / `lint` / `ci` targets.
- [ ] Add the Docker setup under `docker/<variant>/` and finish the variant CI workflow.

## Variant passes

1. **Variant B — Flow** ✅ **done** (the reference). TanStack Start/Router/Query/Table/Virtual + Zod,
   CSS Modules, Oxlint, Vite 7 (Rolldown-capable), Vitest 4, multi-stage Docker, Nx `affected`,
   pnpm catalogs and TypeScript project references. Packages: `flow-domain`, `flow-data-access`,
   `flow-ui`, `flow-app`. See [`apps/flow-app/README.md`](../../apps/flow-app/README.md).
2. **Variant A — Friction**: plain React + Vite, React Router, scattered fetching, heavy table lib,
   single-stage Docker, Nx under-exploited.
3. **Variant C — Overfit**: Next.js + Rust/Axum backend, generated client from OpenAPI/JSON Schema,
   dual toolchain (pnpm + cargo), multi-language CI, complex multi-stage Docker.

### Note from the Flow pass (shared-foundation changes)

Implementing Flow made two **non-breaking, tooling-only** changes to the shared foundation that
Friction and Overfit inherit — neither changes product, data, routes or contracts:

- **Shared packages are now `composite` TypeScript projects** (added `composite`/`declaration`/
  `emitDeclarationOnly`/`outDir`/`references`). This enables the whole project-reference graph to
  build with `tsc -b`. Their standalone `tsc --noEmit` scripts are unchanged and still pass.
- **The toolchain moved to a unified Vitest 4 + catalogs** in `pnpm-workspace.yaml`, with `vite` and
  `oxlint` added at the root. Shared package tests pass unchanged under Vitest 4.

Friction/Overfit should reuse these catalogs and the composite graph rather than re-pinning versions.

## Then: the measurement pass

- Run the shared **AI cost-of-change task** ("Risk trend", `docs/product/03-ai-task-protocol.md`) on
  each variant and record files touched, tests impacted, errors and repro steps.
- Collect real metrics (replace seed values; flip `source` to `collected` in `@signalops/metrics`).
- Fill in [`docs/results-log.md`](../results-log.md) for the manual metrics.

## Guardrails (do not break)

- Don't change the product contract, routes, data model or design.
- Don't simplify the product to make a variant easier.
- Don't replace seed metrics with invented "final" numbers — collect them.
- Don't move or delete `maquettes/` or `docs/product/`.
