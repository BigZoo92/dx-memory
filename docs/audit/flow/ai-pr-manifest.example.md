# AI PR manifest (example)

Copy this block into the description of any PR that used AI assistance on Flow. It makes the change
auditable and is the human counterpart to `pnpm flow:ai-pr-check`.

```md
## AI PR manifest

- **Objective:** <what the change delivers, in one sentence>
- **Prompt (summary):** <the gist of what the assistant was asked; no secrets, no client data>
- **Areas touched:** <packages/routes, e.g. flow-observability, /ops, api-client>
- **Commands run:** pnpm flow:ci:full ; pnpm flow:ai-pr-check ; pnpm flow:a11y
- **Risks (OWASP LLM):** <e.g. LLM03 - one new dev dependency; LLM05 - new error path>
- **Sensitive files:** <none | list>
- **Tests:** <new/updated tests; what they cover>
- **Bundle diff:** <delta from pnpm analyze:flow; confirm /ops stays lazy>
- **A11y diff:** <pnpm flow:a11y result; routes affected>
- **Human review:** <reviewer + what they checked beyond CI>
- **Rollback plan:** <revert commit / feature flag / steps>
```

## Required by rule

- A PR that touches API / errors / security MUST run `pnpm flow:ci:full`.
- A PR that touches UI MUST run `pnpm flow:a11y` (and attach the result).
- A PR that touches the bundle MUST attach a bundle diff (`pnpm analyze:flow`).
- A PR that generates or changes architecture MUST include a decision note (the "Risks" + "Areas"
  fields above, plus a short rationale).
