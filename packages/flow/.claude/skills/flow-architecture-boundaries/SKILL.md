---
name: flow-architecture-boundaries
description: Use when modifying packages/flow (domain, ui, api-client, server-data-access, feature-*). Enforces the allowed/forbidden layer dependencies and runs boundaries/cycles checks. Flow variant only.
---

# flow architecture boundaries

Applies to `packages/flow/**`. Flow variant only. Do not touch other variants,
`docs/product/`, or `maquettes/`. The rules below are enforced by `.dependency-cruiser.cjs`.

## When to use

- Adding/moving code between Flow layers, adding an import, or adding a dependency.

## Allowed / forbidden edges

- `domain`: pure. Forbidden: React, TanStack, `ui`, `fixtures`.
- `ui`: presentational, data-agnostic (props in). Forbidden: `api-client`,
  `server-data-access`, `fixtures`.
- `api-client`: fetch to `/api`. Forbidden: `server-data-access`, `fixtures`.
- `server-data-access`: server-only (Node). Forbidden: React.
- `feature-*`: read via `api-client`. Forbidden: `server-data-access`, `fixtures`.
- Shared socle (`contracts`, `fixtures`, `metrics`, `ui-spec`, `test-scenarios`) must not depend on Flow.
- No cross-variant edges (no `friction`/`overfit`). No circular deps (`routeTree.gen.ts` excepted).

## Conventions

- Keep TypeScript Project References aligned with the package graph after moving code.
- Do not add a dependency unless it is needed.

## Verify (run after any change)

```bash
pnpm audit:flow:boundaries
pnpm audit:flow:cycles
```

Reference: `docs/audit/flow/flow-boundaries.md`.
