# overfit-api — agent instructions (Variant C · Overfit)

Scope: strict. Work only inside `apps/overfit-api`. Never edit Flow
(`apps/flow-app`, `packages/flow`) or Friction from an Overfit task. Do not edit
`docs/product/` or `maquettes/`.

> Not implemented yet. **Do not start Overfit in this pass.** This file scopes future work.

## What Overfit is

Overfit is **Variant C**. Its purpose is pedagogical: it shows the **cost of
over-engineering**. It is *not* "bad code" and not a broken app. The complexity is
deliberate but measured, so Build / Ship / Run / Change costs can be compared against Flow.

Same product as Flow: same routes, same data, same screens, same visible API contract
(see `docs/product/00-product-contract.md`). The product is invariant; only the engineering changes.

## Stack (per the placeholder README and docs)

- Backend: **Rust + Axum**, but only if confirmed by the docs/README. Do not invent a different stack.
- Publishes OpenAPI / JSON Schema; the frontend client is generated from it (codegen if prevu).
- Required endpoints and the `ApiError` envelope are identical to the other variants
  (the TypeScript contract lives in `@signalops/contracts`).

## Rules

- Never modify Flow from an Overfit skill or task.
- Do not change the product. Serve exactly the contract the other variants serve.
- This folder houses a Cargo crate; it is intentionally not a pnpm/Nx project. Keeping Rust
  types in sync with `@signalops/contracts` (or generating them) is part of Overfit's cost story.

## Working style

- Read a file before editing it. Never edit blind.
- Simplest working solution for the chosen approach. Complexity here is deliberate, not accidental.
- Plain hyphens and straight quotes only. No em-dashes, smart quotes, decorative Unicode, or emojis.
- Do not guess APIs, versions, flags, crate names, or package names. Verify in code or docs first.
