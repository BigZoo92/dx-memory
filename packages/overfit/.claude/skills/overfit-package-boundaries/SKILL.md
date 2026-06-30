---
name: overfit-package-boundaries
description: Use when adding or editing future Overfit packages under packages/overfit (Variant C). Keep package boundaries clean and avoid any cross-dependency with Flow. Do not start Overfit in this pass.
---

# overfit package boundaries

Applies to `packages/overfit/**` only (Variant C). Never edit Flow (`apps/flow-app`,
`packages/flow`) or Friction. Do not edit `docs/product/` or `maquettes/`.

> Placeholder. No Overfit packages exist yet. **Do not start Overfit in this pass.**

## Purpose

When Overfit gains internal packages, keep their boundaries clean even though the overall design
is intentionally heavier than Flow.

## Rules

- **No cross-dependency with Flow.** Overfit packages must never import from `packages/flow` or
  `apps/flow-app`, and Flow must never import Overfit.
- Depend only on the shared, variant-agnostic socle: `@signalops/contracts`, `@signalops/fixtures`,
  `@signalops/ui-spec`, `@signalops/metrics`, `@signalops/test-scenarios`.
- No circular dependencies between Overfit packages.
- Same product as Flow (same routes, data, screens, visible API). The product is invariant; only
  the engineering changes.

When boundary tooling for Overfit exists, mirror the Flow approach (a dedicated dependency-cruiser
config + cycle check) rather than reusing Flow's.
