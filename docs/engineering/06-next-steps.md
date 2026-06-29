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

1. **Variant B — Flow** (recommended first; it's the reference): TanStack Start/Router/Query/Table/
   Virtual, Zod, multi-stage Docker, Nx affected.
2. **Variant A — Friction**: plain React + Vite, React Router, scattered fetching, heavy table lib,
   single-stage Docker, Nx under-exploited.
3. **Variant C — Overfit**: Next.js + Rust/Axum backend, generated client from OpenAPI/JSON Schema,
   dual toolchain (pnpm + cargo), multi-language CI, complex multi-stage Docker.

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
