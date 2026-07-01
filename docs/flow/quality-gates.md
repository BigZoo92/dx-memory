# Flow — quality gates

How to reproduce CI locally and keep the bundle, accessibility, and security honest before you push.

## Reproduce CI locally

```bash
pnpm flow:ci:fast    # daily loop: lint + typecheck + tests + boundaries + cycles
pnpm flow:ci         # fast set + build + AI governance check
pnpm flow:ci:full    # + accessibility (Pa11y/Lighthouse) + bundle analyze + docker
pnpm flow:ci:act     # replay the GitHub Actions workflow (needs Docker)
```

The chosen command exits 0 on success. `flow:ci` is the safe pre-push default; `flow:ci:full`
matches what `main` runs.

## Bundle

The client must never ship server code, fixtures, or the server-only Effect logger.

```bash
pnpm analyze:flow    # ANALYZE build → artifacts under docs/audit/flow/ (git-ignored)
for n in server-data-access fixtures/data @effect/platform-node observabilityLoggerLayer; do
  echo "$n: $(grep -rl "$n" apps/flow-app/dist/client | wc -l) file(s)"
done                 # each must print 0
ls apps/flow-app/dist/client/assets | grep -E 'ops-|signals-'   # /ops + /signals = separate chunks
```

**Budget:** observability core is small and framework-free; `/ops` is a lazy chunk that must not load
on other routes; the Effect logger adapter must be **absent** from `dist/client`; the Table/Virtual on
`/signals` stay lazy. If the main `index-*.js` chunk jumps without a clear cause, investigate before
merging. See [architecture.md](architecture.md) and `apps/flow-app/vite.config.ts`.

## Accessibility

```bash
pnpm add -Dw pa11y-ci @lhci/cli   # one-time, if absent
pnpm flow:a11y                    # build + serve + Pa11y CI (WCAG2AA) + Lighthouse CI
```

Audited routes: `/`, `/signals`, `/signals/:id`, `/incidents`, `/compare`, `/dx-metrics`,
`/settings`, `/ops`. Fix real violations at the token/markup level — never add an ignore or mask the
error. `flow:a11y` skips cleanly (exit 0) only when the tooling is absent; real violations exit 1.
Don't add `vitest-axe` to happy-dom suites (known incompatibility).

## Security (local-first)

```bash
pnpm flow:ai-pr-check        # secrets / cross-variant / boundaries (blocking) + warnings
pnpm audit:flow:boundaries
```

Sanity checks: observability events pass through `redact` before storage/export; `/api/logs` is
memory-only, bounded, re-redacted at the boundary; the diagnostic pack carries no secrets, cookies,
`Authorization`, raw prompts, full stacks, or fixture dumps; the server never trusts a raw client
`X-Request-Id` (`resolveRequestId` validates or mints). See
[ai-governance.md](ai-governance.md) and `packages/flow/observability/src/redact.ts`.
