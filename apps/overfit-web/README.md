# overfit-web — Variant C (Overfit) · frontend

> ⏳ **Placeholder.** Not implemented in the socle pass. Built in the dedicated Variant C pass.

The **Overfit** variant is technically serious but over-engineered: it wins raw runtime/build/bundle
numbers while paying a high cognitive and cost-of-change price. It must implement the exact same
product as the other variants
(see [`docs/product/00-product-contract.md`](../../docs/product/00-product-contract.md)).

## Planned stack

- Next.js
- API client **generated** from the backend's OpenAPI / JSON Schema
- Front-end tests (Vitest / Playwright)
- Part of a dual-toolchain setup (pnpm + cargo) with the Rust backend
- More complex multi-stage Docker

## When implemented, it must

- consume `@signalops/contracts`, `@signalops/fixtures`, `@signalops/ui-spec`;
- satisfy every scenario in `@signalops/test-scenarios`;
- expose `build`, `test`, `typecheck`, `lint` and `ci` targets for metrics collection.
