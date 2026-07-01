# Start Flow locally

Run the Flow app on your machine.

## Steps

```bash
pnpm install            # once (or after a dependency change)
pnpm fixtures:generate  # deterministic dataset, no network
pnpm flow:dev           # starts the app at http://localhost:3000
```

Or in one step on a fresh clone: `pnpm flow:onboard`.

## Success criteria

- The app loads at http://localhost:3000.
- The footer shows `API ok`.
- `/signals` renders the virtualized table; `/ops` shows the Operational health surface.

## Common failures

- **Blank data / 500s** - fixtures missing. Run `pnpm fixtures:generate`.
- **Port 3000 in use** - stop the other process or set `PORT`.
- **Stale build** - `pnpm flow:dev:clean`.

## See also

- `docs/golden-paths/flow/debug-flow-error.md`
- `docs/golden-paths/flow/run-flow-ci-locally.md`
