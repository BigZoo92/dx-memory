# @signalops/flow-feature-signal-detail

> The `/signals/:id` Signal Detail screen. Part of the **Flow** variant (`packages/flow/*`).

Header with actions (Assign / Change status / Escalate / Resolve — visible local effect),
stat tiles, description, linked sources, timeline (with partial-error), AI summary, recommended
action and linked incident. The signal id arrives via the `signalId` prop.

## Commands

```bash
pnpm nx run flow-feature-signal-detail:typecheck
pnpm nx run flow-feature-signal-detail:test
pnpm nx run flow-feature-signal-detail:lint
pnpm nx run flow-feature-signal-detail:build
```

See [`docs/flow/architecture.md`](../../../docs/flow/architecture.md) for the
package's place in the dependency graph and the boundaries enforced around it.
