# overfit-web — agent instructions (Variant C · Overfit)

Scope: strict. Work only inside `apps/overfit-web`. Never edit Flow
(`apps/flow-app`, `packages/flow`) or Friction from an Overfit task. Do not edit
`docs/product/` or `maquettes/`.

> Not implemented yet. **Do not start Overfit in this pass.** This file scopes future work.

## What Overfit is

Overfit is **Variant C**. Its purpose is pedagogical: it shows the **cost of
over-engineering**. It is *not* "bad code" and not a broken app. It is a technically
serious build whose complexity is deliberate but measured, so the Build / Ship / Run /
Change costs can be compared against Flow.

Critically: **same product as Flow.** Same routes, same data, same screens, same visible
API contract (see `docs/product/00-product-contract.md`). The product is invariant across
variants; only the engineering approach changes.

## Stack (per the placeholder README and docs)

- Frontend: **Next.js**, but only if confirmed by the docs/README. Do not invent a different stack.
- API client **generated** from the backend OpenAPI / JSON Schema.
- Must consume `@signalops/contracts`, `@signalops/fixtures`, `@signalops/ui-spec` and satisfy
  every scenario in `@signalops/test-scenarios`.

## Rules

- Never modify Flow from an Overfit skill or task.
- Do not change the product, routes, data, or screens. Match Flow's behavior exactly.
- When implemented, expose `build`, `test`, `typecheck`, `lint`, `ci` targets for metrics.

## Working style

- Read a file before editing it. Never edit blind.
- Simplest working solution for the chosen approach. Complexity here is deliberate, not accidental.
- Plain hyphens and straight quotes only. No em-dashes, smart quotes, decorative Unicode, or emojis.
- Do not guess APIs, versions, flags, or package names. Verify in code or docs first.
