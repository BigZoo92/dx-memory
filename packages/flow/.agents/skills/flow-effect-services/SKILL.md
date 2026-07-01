---
name: flow-effect-services
description: Use when integrating Effect TS in packages/flow. Effect belongs in server-data-access and api-client; keep it light in domain and minimal in ui. Flow variant only.
---

# flow Effect services

Applies to `packages/flow/**`. Flow variant only. Do not touch other variants,
`docs/product/`, or `maquettes/`.

## Principle

Effect TS is accepted **only where it reduces cost of delivery** — not as a default and not
everywhere. The goal is fewer bugs and clearer error/resource handling at the data edges,
without pushing a heavy abstraction into pure logic or the view.

## Where it goes

- `server-data-access`: good fit. Effects for IO, error channels, resource/scope management.
- `api-client`: acceptable for request orchestration and typed error handling.
- `domain`: keep it **light**. Domain stays framework-free and easy to read; do not let Effect
  leak as a hard requirement of pure functions/types.
- `ui`: **minimal to none**. UI receives plain data via props; do not run Effect in components.

## Rules

- Adding Effect must not break layer boundaries (see `flow-architecture-boundaries`).
- Watch the client bundle: Effect imported into client code adds weight. Keep server-only Effect
  out of the browser bundle (see `flow-bundle-audit`).
- Do not introduce Effect into a layer just for consistency. Justify it by delivery cost.

## Verify

```bash
pnpm audit:flow:boundaries
pnpm nx run flow-app:typecheck
pnpm nx run flow-app:build
```

Measure bundle impact before/after with `pnpm analyze:flow` (see `docs/flow/quality-gates.md`).
