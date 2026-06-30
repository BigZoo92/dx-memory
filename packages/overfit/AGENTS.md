# packages/overfit — agent instructions (Variant C · Overfit)

Scope: strict. Work only inside `packages/overfit`. Never edit Flow
(`apps/flow-app`, `packages/flow`) or Friction from an Overfit task. Do not edit
`docs/product/` or `maquettes/`.

> Placeholder. No Overfit packages exist yet. **Do not start Overfit in this pass.**

## What Overfit is

Overfit is **Variant C**. Its purpose is pedagogical: it shows the **cost of
over-engineering**. It is *not* "bad code" and not a broken app. Complexity is deliberate
but measured, so Build / Ship / Run / Change costs can be compared against Flow.

Same product as Flow: same routes, same data, same screens, same visible API contract
(see `docs/product/00-product-contract.md`). The product is invariant; only the engineering changes.

## Rules for future packages here

- Never modify Flow from an Overfit skill or task. No cross-dependency with `packages/flow`.
- Depend only on the shared, variant-agnostic socle (`@signalops/contracts`, `fixtures`,
  `ui-spec`, `metrics`, `test-scenarios`) — never on another variant.
- Avoid cycles. Keep package boundaries clean even when the design is intentionally heavier.

## Working style

- Read a file before editing it. Never edit blind.
- Simplest working solution for the chosen approach. Complexity here is deliberate, not accidental.
- Plain hyphens and straight quotes only. No em-dashes, smart quotes, decorative Unicode, or emojis.
- Do not guess APIs, versions, flags, or package names. Verify in code or docs first.
