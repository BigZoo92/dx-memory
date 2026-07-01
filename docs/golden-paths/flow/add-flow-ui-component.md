# Add a Flow UI component

Add a presentational component to `packages/flow/ui`.

## Steps

1. Create `packages/flow/ui/src/<group>/<Component>.tsx` + a CSS Module (`<Component>.module.css`).
2. Keep it **data-agnostic**: take data via props, define local prop types. Do NOT import
   `flow-api-client`, `server-data-access`, `fixtures` or `flow-observability`.
3. Style from design tokens (`var(--so-*)`). Carry meaning by text + shape, never color alone.
4. Accessibility: real semantics (`button`, `th scope`, `label htmlFor`), `aria-*` on icon-only
   controls, visible focus (the global `:focus-visible` ring applies).
5. Export it from the group `index.ts` (and it flows through `packages/flow/ui/src/index.ts`).
6. Add a Testing Library test asserting roles/names (`getByRole`, `toHaveAccessibleName`).

## Success criteria

- `pnpm --filter @signalops/flow-ui run typecheck` and `test` are green.
- `pnpm audit:flow:boundaries` passes (no UI -> data-layer edge).

## Common failures

- **Color-only status** - add a text label (see `Badge`).
- **CSS module class not found** - class names must match between `.module.css` and the TSX; prefer
  camelCase keys to stay convention-independent.

## See also

- `packages/flow/ui/src/a11y/*`, `docs/golden-paths/flow/accessibility-check-flow.md`
