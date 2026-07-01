---
name: flow-bundle-audit
description: Use when analyzing the Flow client bundle. Confirms fixtures and server-data-access never reach the browser, and that the signals Table/Virtual stay lazy. Covers apps/flow-app and packages/flow. Flow variant only.
---

# flow bundle audit

Applies to the Flow client bundle produced from `apps/flow-app` + `packages/flow`. Flow variant
only. Do not touch other variants, `docs/product/`, or `maquettes/`.

## When to use

- Investigating bundle size, a regression, or what got pulled into a client chunk.

## What to check

- `@signalops/fixtures` (dataset generator) must be **absent** from any client chunk.
- `@signalops/flow-server-data-access` must be **absent** from the client bundle. Only
  `src/routes/api/` and `src/server/` import it, and they are server-only.
- On `/signals`, the heavy Table / virtualization must stay **lazy-loaded** (its own chunk),
  not in the initial route bundle.
- Watch Effect TS weight in client chunks (see `flow-effect-services`).

## How to run

```bash
pnpm analyze:flow           # ANALYZE=true build, emits the visualizer
pnpm audit:flow:boundaries  # forbidden client->fixtures / client->server edges fail here too
```

Outputs land (git-ignored) in `docs/audit/flow/` (`bundle-stats.after.{html,json,md}`); regenerate them anytime with `pnpm analyze:flow`. Compare chunk sizes before/after a change.
