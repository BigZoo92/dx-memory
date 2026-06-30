---
name: overfit-api-rust-axum
description: Use when working on the Overfit backend in apps/overfit-api (Variant C). Rust + Axum if confirmed by docs, OpenAPI/codegen if planned. Same API contract as Flow. Never modifies Flow. Do not start Overfit in this pass.
---

# overfit-api Rust Axum

Applies to `apps/overfit-api` only (Variant C). Never edit Flow (`apps/flow-app`,
`packages/flow`) or Friction. Do not edit `docs/product/` or `maquettes/`.

> Not implemented yet. **Do not start Overfit in this pass.**

## Framing

Overfit is the deliberately over-engineered variant, serving the **same product** as Flow.
The visible API contract is identical across variants (`docs/product/00-product-contract.md`,
`@signalops/contracts`). Do not invent a different product.

## Rules

- Stack: **Rust + Axum**, only if confirmed by the README/docs. This folder houses a Cargo crate;
  it is intentionally not a pnpm/Nx project.
- Publish **OpenAPI / JSON Schema**; the frontend client is generated from it (codegen if prevu).
- Required endpoints and the `ApiError` envelope are identical to the other variants. Keeping Rust
  types in sync with `@signalops/contracts` (or generating them) is part of Overfit's cost story.
- Never modify Flow from here. No cross-variant coupling.

## Cost story

Track the Build / Ship / Run / Change cost of the dual toolchain (pnpm + cargo), codegen, and
multi-stage Docker in `docs/audit/overfit/` (see `overfit-overengineering-control`).
