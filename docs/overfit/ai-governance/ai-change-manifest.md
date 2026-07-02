# AI Change Manifest - "Add Risk trend"

This is the concrete task manifest for the demonstration change: add a Risk trend capability (`riskTrend: up | stable | down`) to the product. It appears in `/signals` as a text badge (Rising / Stable / Falling, never color alone) with a Risk trend filter, and in the signal detail and dx-metrics views.

## Task

- Intent: add a Risk trend attribute to signals and expose it in the UI.
- Scope: the full Overfit stack. Product-visible behavior must match Flow exactly.
- Constraints: never touch Flow, Friction, the shared product docs, or the mockups (forbidden files, see `ai-policy.md`). Accessibility rule: text badge, never color alone.

## Numbers

- Files touched: 41.
- Tests impacted: 72.
- Error-repro steps (for the associated debugging demo): 9.
- Docs pages: 8.

These are the Overfit figures. Flow's equivalents for the same product change are about 6 files, 9 tests, and 1 doc. The gap is the whole point of the variant.

## Artifacts to regenerate (not hand-edited)

- `generated/overfit/openapi.json` - the maintained contract, updated to include `riskTrend`, then used as the source for regeneration.
- `packages/overfit/contracts-generated` - regenerated via `pnpm overfit:contracts:generate` (DTOs + runtime validators).
- `generated/overfit/contracts.lock.json` - the schema+operation hash, rewritten by the same command; verified by `overfit:contracts:check`.
- The JSON manifests under `packages/overfit/generated-manifests` (architecture / endpoint / route) - regenerated.

## Coordinated edits (summary)

The manifest enumerates edits across the Rust domain enum and value objects, DTOs, fixtures generator, read models and mappers, Rust tests, the runtime schema and api-client, feature-signals (column + filter), signal detail, dx-metrics, the docs, an ADR, the schema-registry manifest, the AI governance manifest, the changelog, and the quality-gates snapshots. The exhaustive, file-by-file checklist is in `change-management/risk-trend-change-surface.md`.

## Governance

The manifest is validated by `pnpm overfit:policy:check`. The `ai` policy scores the change for manifest-scope compliance, forbidden-files avoidance, generated-artifact regeneration, and reviewer routing (see `reviewer-matrix.md`). The change is releasable only when the five quality gates pass (see `policies/release-policy.md`).
