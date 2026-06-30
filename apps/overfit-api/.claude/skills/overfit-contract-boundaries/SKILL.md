---
name: overfit-contract-boundaries
description: Use when verifying that the Overfit variant honors the shared contracts and fixtures and exposes the exact same visible API as Flow. Complexity is deliberate, the product is invariant. Covers apps/overfit-api and apps/overfit-web.
---

# overfit contract boundaries

Applies to the Overfit variant (`apps/overfit-api`, `apps/overfit-web`, `packages/overfit`).
Never edit Flow or Friction. Do not edit `docs/product/` or `maquettes/`.

> Do not start Overfit in this pass.

## Purpose

Guarantee that Overfit, however internally complex, presents the **same product and the same
visible API** as the other variants. Complexity is deliberate; the product is invariant.

## What to verify

- Endpoints, request/response shapes, and the `ApiError` envelope match `@signalops/contracts`
  exactly. No extra or missing public endpoints.
- The backend serves the contract in `docs/product/00-product-contract.md`; the frontend client
  is generated from the backend schema and stays in sync.
- `@signalops/fixtures` data is honored identically: same data, same screens, same routes as Flow.
- Every scenario in `@signalops/test-scenarios` passes.

## Rule

The cost of over-engineering may show in Build / Ship / Run / Change, **never** in a divergent
product. If a complexity choice would change the visible API or behavior, it is out of scope.
