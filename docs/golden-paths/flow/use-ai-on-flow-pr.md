# Use AI on a Flow PR

How to let an assistant help on Flow without losing control.

## Rules (the short list)

- No secret in a prompt. No real client data. No raw logs with tokens.
- No destructive command run automatically.
- No cross-variant change (Friction/Overfit) without an explicit ask.
- No CI change without justification. No new dependency without justification.
- No generated architecture without a decision note.
- API/errors/security change -> run `flow:ci:full`. UI change -> run `flow:a11y`. Bundle change ->
  attach a bundle diff.

## Steps

1. Scope the task to Flow (`packages/flow/*`, `apps/flow-app`). The scope-guard hook blocks the rest.
2. Let the assistant work; keep diffs reviewable.
3. Run the gate:
   ```bash
   pnpm flow:ai-pr-check     # secrets / cross-variant / boundaries (blocking) + warnings
   pnpm flow:ci              # lint + typecheck + tests + build + ai-pr-check
   ```
4. Fill the AI PR manifest (`docs/audit/flow/ai-pr-manifest.example.md`) in the PR description.

## Success criteria

- `flow:ai-pr-check` passes with no blocking issues; every warning is addressed or justified.
- The manifest is complete (objective, prompt summary, risks, tests, bundle/a11y diffs, rollback).

## See also

- `docs/audit/flow/ai-pr-check-policy.md`, `docs/golden-paths/flow/review-ai-generated-pr.md`
