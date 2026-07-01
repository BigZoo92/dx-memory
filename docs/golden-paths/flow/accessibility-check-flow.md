# Accessibility check (Flow)

Audit the Flow routes for accessibility.

## Steps

```bash
pnpm add -Dw pa11y-ci @lhci/cli   # one-time (dev/CI-only tools, real Chromium)
pnpm flow:a11y                    # build + serve + Pa11y CI + Lighthouse CI
```

`flow:a11y` resolves a real signal id for `/signals/:id`, audits each route on a fresh page load (so
demo controls default to OFF and never cause false failures), and skips with guidance if the tools are
absent.

Routes audited: `/`, `/signals`, `/signals/:id`, `/incidents`, `/compare`, `/dx-metrics`, `/settings`,
`/ops`.

## Component-level checks

Flow tests run on happy-dom, where `vitest-axe` does not work and contrast is not measurable. So we use
Testing Library role assertions (`getByRole`, `toHaveAccessibleName`) in unit tests and rely on Pa11y /
Lighthouse (Chromium) for contrast and full-page axe.

## Success criteria

- Pa11y CI reports no WCAG2AA violations on the audited routes.
- Lighthouse accessibility score meets the budget in `.lighthouserc.json` (perf budget may start as a
  warning).

## Common failures

- **happy-dom + vitest-axe error** - expected; do not add vitest-axe to the happy-dom suites.
- **Contrast flagged** - fix the token or text, not the test.

## See also

- `docs/audit/flow/accessibility-report.md`, `packages/flow/ui/src/a11y/*`
