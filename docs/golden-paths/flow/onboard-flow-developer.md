# Onboard a Flow developer

From clone to running app and green checks.

## Steps

```bash
pnpm flow:doctor     # checks Node >= 20.11, pnpm, lockfile, fixtures, docker/act
pnpm install         # install dependencies (flow:onboard never auto-installs)
pnpm flow:onboard    # doctor + fixtures + prints the next commands
pnpm flow:dev        # http://localhost:3000
pnpm flow:ci:fast    # lint + typecheck + tests + boundaries + cycles
```

## Success criteria

- `pnpm flow:doctor` prints "doctor passed".
- `pnpm flow:ci:fast` is green.
- You can open `/`, `/signals`, `/ops`, `/dx-metrics`.

## Common failures

- **doctor blocks on Node** - install Node >= 20.11 (nvm: `nvm use`).
- **fixtures missing** - `pnpm fixtures:generate`.

## See also

- `docs/engineering/01-local-setup.md`
- `docs/golden-paths/flow/create-flow-feature.md`
