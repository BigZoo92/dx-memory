# friction-api — Variant A (Friction) · backend

> ⏳ **Placeholder.** Not implemented in the socle pass. Built in the dedicated Variant A pass.

Backend for the Friction variant. Must serve the API contract in
[`docs/product/00-product-contract.md`](../../docs/product/00-product-contract.md) from the shared
fixtures.

## Planned stack

- Fastify
- Data loaded from `@signalops/fixtures`
- Loose/ad-hoc validation and error handling (intentional friction)
- Vitest
- Simple (single-stage) Docker

## Required endpoints

`GET /api/health`, `GET /api/signals`, `GET /api/signals/:id`, `GET /api/signals/:id/events`,
`GET /api/incidents`, `GET /api/dashboard/summary`, `GET /api/compare/:id`, `GET /api/dx-metrics`,
`POST /api/simulate-error`. Errors must use the canonical `ApiError` envelope from
`@signalops/contracts`.
