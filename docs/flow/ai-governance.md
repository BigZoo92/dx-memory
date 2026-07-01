# Flow — AI governance

How to use AI assistance on Flow PRs safely. The executable form of this policy is
`scripts/flow/ai-pr-check.mjs`, run via `pnpm flow:ai-pr-check`; this doc is the human counterpart.

## The check

```bash
pnpm flow:ai-pr-check   # on your changes, before opening a PR
pnpm flow:ci            # lint + typecheck + tests + build + ai-pr-check
```

It inspects working-tree changes (git diff vs HEAD + untracked files) and reports at two levels.
The split is deliberate: **block** only where a mistake is expensive and unambiguous; **warn** where
judgement is needed, and tighten over time.

### Blocking (fails, exit 1)

- **Secrets** — private keys, AWS keys, `secret|token|api_key|password = "..."`, JWT-shaped strings
  (OWASP LLM02 / LLM07).
- **Cross-variant changes** — any edit under `apps|packages/(friction|overfit)`. Flow work stays in
  Flow (LLM06).
- **Architecture boundaries** — runs `pnpm audit:flow:boundaries`; a forbidden edge fails (LLM05).

### Warning (surfaced, does not fail)

- **Protected paths** — `docs/product/`, `maquettes/`, `packages/metrics/`, `packages/contracts/`.
- **Dependencies** — any `package.json` / `pnpm-lock.yaml` change (LLM03 supply chain).
- **Docs drift** — an architecture/config change without a matching `docs/` change (LLM09).
- **Risky TODO markers** — a `TODO` marker flagged as remove / hack / fixme / danger.

To promote a warning to blocking as the team's tolerance drops, tighten the `blocking += 1` handling
in `scripts/flow/ai-pr-check.mjs`. Suggested order: protected paths → dependency additions → docs drift.

## Human review checklist (beyond what CI proves)

- You can explain the change and why it's safe from the diff alone.
- All blocking checks pass; every warning is addressed or justified in the manifest.
- Scope respected (`packages/flow/*`, `apps/flow-app` only); no cross-variant edits.
- Tests are meaningful (not empty snapshots); no `any` smuggling.
- Dependencies justified and minimal; bundle clean (see [quality-gates.md](quality-gates.md#bundle)).
- Accessibility verified for UI changes (`pnpm flow:a11y`).

## AI PR manifest

Copy this into the description of any PR that used AI assistance on Flow:

```md
## AI PR manifest
- **Objective:** <what the change delivers, in one sentence>
- **Prompt (summary):** <the gist of what the assistant was asked; no secrets, no client data>
- **Areas touched:** <packages/routes, e.g. flow-observability, /ops, api-client>
- **Commands run:** pnpm flow:ci:full ; pnpm flow:ai-pr-check ; pnpm flow:a11y
- **Risks (OWASP LLM):** <e.g. LLM03 — one new dev dependency; LLM05 — new error path>
- **Sensitive files:** <none | list>
- **Tests:** <new/updated tests; what they cover>
- **Bundle diff:** <delta from pnpm analyze:flow; confirm /ops stays lazy>
- **A11y diff:** <pnpm flow:a11y result; routes affected>
- **Human review:** <reviewer + what they checked beyond CI>
- **Rollback plan:** <revert commit / feature flag / steps>
```

**Required by rule:** a PR touching API/errors/security MUST run `pnpm flow:ci:full`; a PR touching
UI MUST run `pnpm flow:a11y` and attach the result; a PR touching the bundle MUST attach a bundle
diff; a PR that generates or changes architecture MUST include a decision note.
