# friction-web — Variant A (Friction) · frontend

> ⏳ **Placeholder.** Not implemented in the socle pass. The application is built in the
> dedicated Variant A pass.

The **Friction** variant is a functional product with deliberately neglected DX, to show the cost
of low Developer Experience. It must still implement the exact same product as the other variants
(see [`docs/product/00-product-contract.md`](../../docs/product/00-product-contract.md)).

## Planned stack

- React (plain) + Vite
- React Router
- Data fetching via SWR or scattered `fetch` calls
- A heavy table library
- Classic lodash usage
- Vitest
- Simple (single-stage) Docker
- Nx present but under-exploited (on purpose)

## When implemented, it must

- consume `@signalops/contracts`, `@signalops/fixtures`, `@signalops/ui-spec`;
- satisfy every scenario in `@signalops/test-scenarios`;
- expose `build`, `test`, `typecheck`, `lint` and `ci` targets for metrics collection.
