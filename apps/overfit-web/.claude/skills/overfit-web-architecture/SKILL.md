---
name: overfit-web-architecture
description: Use when working on the Overfit frontend in apps/overfit-web (Variant C). Same product as Flow, Next.js if confirmed by docs. Never modifies Flow. Do not start Overfit in this pass.
---

# overfit-web architecture

Applies to `apps/overfit-web` only (Variant C). Never edit Flow (`apps/flow-app`,
`packages/flow`) or Friction. Do not edit `docs/product/` or `maquettes/`.

> Not implemented yet. **Do not start Overfit in this pass.**

## Framing

Overfit is the deliberately over-engineered variant. **Same product as Flow**: same routes,
same data, same screens, same visible API contract (`docs/product/00-product-contract.md`).
The product is invariant; only the engineering approach differs.

## Rules

- Stack: **Next.js** for the frontend, only if confirmed by the README/docs. Do not invent a
  different product or a stack the docs do not describe.
- API client is **generated** from the backend OpenAPI / JSON Schema.
- Consume `@signalops/contracts`, `@signalops/fixtures`, `@signalops/ui-spec`; satisfy every
  scenario in `@signalops/test-scenarios`.
- Never modify Flow from here. No cross-variant imports.
- Complexity must be deliberate and measured, never a broken or half-built app.

## Cost story

Document the Build / Ship / Run / Change cost of each over-engineering choice so Overfit can be
compared against Flow (see `overfit-overengineering-control`).
