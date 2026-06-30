# @signalops/flow-feature-settings

> The `/settings` screen. Part of the **Flow** variant (`packages/flow/*`).

Environment block (live API status), feature-flag toggles, and demo controls that have a
real effect: "Simulate API error" / "Simulate slow network" flip client-side demo controls so every
widget actually fails or slows; "Reset demo state" clears them. Variant identity is passed via the
`variant` prop.

## Commands

```bash
pnpm nx run flow-feature-settings:typecheck
pnpm nx run flow-feature-settings:test
pnpm nx run flow-feature-settings:lint
pnpm nx run flow-feature-settings:build
```

See [`docs/audit/flow/flow-boundaries.md`](../../../docs/audit/flow/flow-boundaries.md) for the
package's place in the dependency graph and the boundaries enforced around it.
