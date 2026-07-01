# Flow - AI governance report

Flow uses AI assistance but governs it. This report maps the relevant OWASP Top 10 for LLM Applications
(2025) risks to a concrete Flow rule, the automated check that enforces it, the human check, and the
proof expected in a PR.

Sources: OWASP Top 10 for LLM Applications 2025 (https://genai.owasp.org/llm-top-10/).

## Risk matrix

| OWASP LLM (2025) | Flow rule | Automated check | Level | Human check | Proof in PR |
| --- | --- | --- | --- | --- | --- |
| LLM01 Prompt Injection | No auto-run of destructive commands from AI content | scan for `rm -rf`, `curl \| sh` in changed scripts | warning | review new scripts | diff of scripts reviewed |
| LLM02 Sensitive Information Disclosure | No secret / client data / sensitive log in prompt or code | secret scan in `ai-pr-check` | blocking | confirm no PII | green secret scan |
| LLM03 Supply Chain | No new dependency without justification | dependency-manifest diff | warning | justify each add | decision note |
| LLM04 Data and Model Poisoning | Deterministic fixtures only, no real data | protected-path check on `packages/metrics`, fixtures | warning | review data source | fixtures confirmation |
| LLM05 Improper Output Handling | AI output is typed + bounded by the layer contracts | `audit:flow:boundaries` + typecheck + tests | blocking (boundaries) | integration review | green CI |
| LLM06 Excessive Agency | No cross-variant or CI change without explicit ask | cross-variant file check (+ scope-guard hook) | blocking (cross-variant) | scope validation | scope-guard + check pass |
| LLM07 System Prompt Leakage | No prompt files with secrets | secret scan | blocking (if secret) | review | green scan |
| LLM09 Misinformation / Overreliance | Generated architecture needs a decision note | docs-drift warning | warning | architecture review | decision note present |
| LLM10 Unbounded Consumption | Memory-only, bounded stores; no full dumps | bundle budget + bounded ring buffers (code) | warning | review | bundle diff |

## What is already in place

- Repo hooks: `.claude/hooks/signalops-scope-guard.py` (blocks cross-variant / product edits) and
  `signalops-post-edit-dispatch.py` (runs boundaries/cycles on Flow edits).
- Variant scope docs: `packages/flow/CLAUDE.md`, `apps/flow-app/CLAUDE.md`, `docs/agents/...`,
  `docs/product/03-ai-task-protocol.md`.
- The `analyzing-total-delivery-cost` skill (cost-of-change framing) and the Flow architecture skills.

## What this pass added

- `pnpm flow:ai-pr-check` - automated secret / cross-variant / boundaries gate (blocking) plus
  protected-path / dependency / docs-drift / TODO warnings.
- `docs/audit/flow/ai-pr-check-policy.md` - the policy and how to promote warnings to blocking.
- `docs/audit/flow/ai-pr-manifest.example.md` - the per-PR disclosure template.
- Golden paths `use-ai-on-flow-pr.md` and `review-ai-generated-pr.md`.

## Redaction guarantee (LLM02/LLM10)

All observability events pass through `redact` (in `@signalops/flow-observability`) before they are
stored or exported: credential-like keys are stripped, bearer/JWT/long tokens are masked, strings are
truncated and object depth is bounded. The diagnostic pack and `POST /api/logs` re-redact at their
boundary. No secrets, cookies, Authorization, raw prompts, full stacks or fixture dumps are ever stored.

## Limits

- The secret scan is regex-based (catches common shapes, not everything) - keep human review.
- `ai-pr-check` inspects the working tree; wire it into CI on the PR diff for branch coverage
  (see `.github/workflows/flow-ci.yml`).
