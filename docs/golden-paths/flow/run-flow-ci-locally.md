# Run the Flow CI locally

Reproduce the pipeline before pushing.

## Steps

```bash
pnpm flow:ci:fast    # daily loop: lint + typecheck + tests + boundaries + cycles
pnpm flow:ci         # + build + AI governance check
pnpm flow:ci:full    # + accessibility (Pa11y/Lighthouse) + bundle analyze + docker
```

Optional - replay the GitHub Actions workflow itself:

```bash
pnpm flow:ci:act     # needs Docker; uses nektos/act on .github/workflows/flow-ci.yml
```

## Which one to use

- Before every commit: `flow:ci:fast` (seconds, cached).
- Before opening a PR: `flow:ci`.
- Before a release or a risky change: `flow:ci:full`.

## Success criteria

- The chosen command exits 0.
- `flow:ci:full` produces `docs/audit/flow/bundle-stats.after.*` and (if tooling present) an a11y report.

## Common failures

- **a11y step skipped** - `pa11y-ci` / `@lhci/cli` not installed (dev-only). Install with
  `pnpm add -Dw pa11y-ci @lhci/cli`. The skip is intentional and not a failure.
- **act is slow / missing tools** - prefer `flow:ci`; use `act` only to validate the YAML.

## See also

- `docs/engineering/05-ci-strategy.md`
- `docs/audit/flow/command-reference.md`
