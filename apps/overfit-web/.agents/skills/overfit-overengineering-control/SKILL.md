---
name: overfit-overengineering-control
description: Use across the Overfit variant (apps/overfit-web, apps/overfit-api, packages/overfit) to keep over-engineering deliberate and measured. Document Build/Ship/Run/Change costs. Never a broken app. Never modifies Flow.
---

# overfit over-engineering control

Applies to the whole Overfit variant (`apps/overfit-web`, `apps/overfit-api`,
`packages/overfit`). Never edit Flow or Friction. Do not edit `docs/product/` or `maquettes/`.

> Do not start Overfit in this pass. This skill governs how Overfit is built when its pass begins.

## Purpose

Overfit exists to **demonstrate the cost of over-engineering** while delivering the exact same
product as Flow. The point is a fair, measurable comparison, not a strawman.

## Rules

- Over-engineering is **deliberate and measured**. Each heavy choice (extra layers, codegen,
  dual toolchain, multi-stage Docker, generated clients) must be intentional.
- **Not** just a broken or sloppy app. Overfit must work and pass the shared scenarios; the cost
  shows up as Build / Ship / Run / Change overhead, not as bugs or missing features.
- Same product as Flow: same routes, data, screens, visible API. Do not change the product.
- Never modify Flow from an Overfit task.

## Document the cost

For each over-engineering decision, record its impact in `docs/audit/overfit/`:

- **Build** — toolchain complexity, codegen steps, compile times.
- **Ship** — CI matrix (pnpm + cargo), Docker stages, deploy surface.
- **Run** — runtime/memory/latency (often Overfit's strength).
- **Change** — cost of a typical product change across the extra layers (often Overfit's weakness).
