# packages/flow — agent instructions (Variant B · Flow)

Scope: strict. Work only inside `packages/flow`. Do not edit other variants
(`overfit-*`, `friction-*`), `docs/product/`, or `maquettes/` in this package's tasks.

## Layers and the edges between them

The executable form of these rules is `.dependency-cruiser.cjs` at the repo root
(run via `pnpm audit:flow:boundaries`). Keep code on the right side of every edge.

- `domain` — pure. No React, no TanStack, no UI, no fixtures. Framework-free logic and types.
- `ui` — presentational and **data-agnostic**. Receives data via props. Must not import
  `api-client`, `server-data-access`, or `fixtures`.
- `api-client` — talks to `/api` over fetch. No `server-data-access`, no `fixtures`.
- `server-data-access` — **server-only** (Node). No React. The only data-access layer.
- `feature-*` — screens. Read data over HTTP via `api-client`. **Never** import
  `server-data-access`, and never import `fixtures`.
- Shared socle packages (`contracts`, `fixtures`, `metrics`, `ui-spec`, `test-scenarios`)
  must stay variant-agnostic. Flow may depend on them; they must not depend on Flow.
- No cross-variant dependencies. No circular dependencies (`routeTree.gen.ts` excepted).

## Conventions

- Keep TypeScript Project References aligned with the package graph when you add or move code.
- Do not add a dependency unless it is needed. Prefer existing socle packages.
- Effect TS is accepted **only where it reduces cost of delivery** (see the
  `flow-effect-services` skill). It is not a default; keep it out of `domain`/`ui` unless it pays.

## Recommended commands

```bash
pnpm audit:flow:boundaries
pnpm audit:flow:cycles
pnpm nx run flow-app:typecheck
pnpm nx run flow-app:test
```

## Working style

- Read a file before editing it. Never edit blind.
- Simplest working solution. No speculative features or premature abstraction.
- Return code first; explain only the non-obvious. Comments only where logic is unclear.
- No docstrings or type annotations on code you are not changing.
- No error handling for cases that cannot happen.
- Plain hyphens and straight quotes only. No em-dashes, smart quotes, decorative Unicode, or emojis.
- Do not guess APIs, versions, flags, or package names. Verify in code or docs first.
