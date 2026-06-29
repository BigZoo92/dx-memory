# overfit-api — Variant C (Overfit) · backend

> ⏳ **Placeholder.** Not implemented in the socle pass. Built in the dedicated Variant C pass.

Rust backend for the Overfit variant. Serves the API contract in
[`docs/product/00-product-contract.md`](../../docs/product/00-product-contract.md) and publishes a
schema the frontend client is generated from.

## Planned stack

- Rust + Axum
- OpenAPI / JSON Schema published for client generation
- Rust tests (`cargo test`) alongside the front-end tests
- Multi-language CI (pnpm + cargo)
- More complex multi-stage Docker

## Notes

- This folder is intentionally **not** a pnpm/Nx project in the socle pass (it will house a Cargo
  crate). The TypeScript contract it must honor lives in `@signalops/contracts`; keeping the Rust
  types in sync (or generating them) is part of the Overfit variant's cost story.
- Required endpoints and the `ApiError` envelope are identical to the other variants.
