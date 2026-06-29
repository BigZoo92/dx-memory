# flow-app — Variant B (Flow) · full-stack

> ⏳ **Placeholder.** Not implemented in the socle pass. Built in the dedicated Variant B pass.

The **Flow** variant is the balanced, low-cost-to-change reference: clarity, fast feedback loops
and clean contracts. It is a single full-stack app (frontend + server routes) and must implement
the exact same product as the other variants
(see [`docs/product/00-product-contract.md`](../../docs/product/00-product-contract.md)).

## Planned stack

- TanStack Start + TanStack Router
- TanStack Query (data) + TanStack Table + TanStack Virtual (10k-row table)
- Zod validation against `@signalops/contracts`
- Vitest
- Nx with `affected`
- Multi-stage Docker
- Clear contracts, short documentation

## When implemented, it must

- consume `@signalops/contracts`, `@signalops/fixtures`, `@signalops/ui-spec`;
- satisfy every scenario in `@signalops/test-scenarios`;
- expose `build`, `test`, `typecheck`, `lint` and `ci` targets for metrics collection.
