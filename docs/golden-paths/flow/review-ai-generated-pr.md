# Review an AI-generated Flow PR

The human checklist beyond what CI proves.

## Steps

1. **Manifest present?** Objective, prompt summary, areas, risks, tests, bundle/a11y diffs, rollback.
2. **Gate green?** `pnpm flow:ai-pr-check` (no blocking) and `pnpm flow:ci` in CI.
3. **Boundaries & scope** - changes stay in `packages/flow/*` / `apps/flow-app`; no cross-variant, no
   `packages/metrics` / `packages/contracts` / `docs/product` edits unless justified.
4. **Correctness** - read the diff, not just the green check. Does the error path log + correlate by
   request id? Are new types honest (no `any` smuggling)?
5. **Tests** - meaningful assertions, not snapshots of nothing. Run them locally.
6. **Dependencies** - any new dep justified and minimal (LLM03 supply chain).
7. **Bundle** - `/ops` and Table/Virtual still lazy; no `server-data-access`/`fixtures`/`@effect/platform-node`
   in `dist/client` (`pnpm analyze:flow` + grep).
8. **Accessibility** - if UI changed, `pnpm flow:a11y` and a manual keyboard pass.

## Success criteria

- You can explain what the change does and why it is safe, from the diff alone.
- All blocking checks pass; warnings are justified in the manifest.

## See also

- `docs/audit/flow/ai-governance-report.md`
