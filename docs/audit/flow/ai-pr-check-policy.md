# Flow - AI PR check policy

The executable form of this policy is `scripts/flow/ai-pr-check.mjs`, run via `pnpm flow:ai-pr-check`.
It inspects the working-tree changes (git diff vs HEAD + untracked files) and reports findings at two
levels. The split is deliberate: block only where a mistake is expensive and unambiguous; warn (do not
block) where judgement is needed, and tighten over time.

## Levels

### Blocking (fails the check, exit 1)

- **Secrets** - private keys, AWS keys, `secret|token|api_key|password = "..."`, JWT-shaped strings in
  any changed text file. Maps to OWASP LLM02 (Sensitive Information Disclosure) and LLM07 (System
  Prompt Leakage).
- **Cross-variant changes** - any change under `apps|packages/(friction|overfit)`. Flow work must stay
  in Flow. Maps to LLM06 (Excessive Agency).
- **Architecture boundaries** - runs `pnpm audit:flow:boundaries` (dependency-cruiser). A forbidden
  edge (UI to server, feature to fixtures, observability to React, etc.) fails the check. Maps to
  LLM05 (Improper Output Handling - generated code must respect the contracts).

### Warning (surfaced, does not fail)

- **Protected paths** - edits under `docs/product/`, `maquettes/`, `packages/metrics/`,
  `packages/contracts/`. These are shared/product surfaces; an AI change there needs explicit human
  justification.
- **Dependencies** - any `package.json` / `pnpm-lock.yaml` change. New dependencies must be justified
  (LLM03 Supply Chain).
- **Docs drift** - an architecture/config change (`packages/flow/*/package.json|tsconfig.json`,
  `.dependency-cruiser.cjs`) without a matching `docs/` change. Maps to LLM09 (Misinformation /
  overreliance - architecture should not be generated without a decision note).
- **Risky TODO markers** - `TODO: remove|hack|fixme|danger`.

## When to escalate a warning to blocking

Once the team is comfortable with the noise level, promote in this order: protected paths -> dependency
additions -> docs drift. Edit the `blocking += 1` handling in `scripts/flow/ai-pr-check.mjs`.

## How to run

```bash
pnpm flow:ai-pr-check        # on your changes, before opening a PR
pnpm flow:ci:full            # includes ai-pr-check + a11y + analyze + docker
```

## What a passing run looks like

```
== AI PR check - Flow governance ==
  ..  N changed file(s)
== Secrets (blocking) ==           ok  no secrets detected
== Cross-variant & boundaries ==   ok  no cross-variant file changes / boundaries pass
== Protected paths (warning) ==    ok  no protected paths modified
  ok  AI PR check passed (blocking checks clean; warnings are advisory)
```

See `docs/golden-paths/flow/use-ai-on-flow-pr.md` and `review-ai-generated-pr.md` for the human side.
