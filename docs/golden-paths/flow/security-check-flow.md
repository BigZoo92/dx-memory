# Security check (Flow)

A lightweight, local-first security pass for Flow.

## Steps

```bash
pnpm flow:ai-pr-check     # secrets (blocking), cross-variant (blocking), boundaries (blocking)
pnpm audit:flow:boundaries
```

Then sanity-check the data-handling guarantees:

- **Redaction** - observability events pass through `redact` before storage/export (keys like
  authorization/cookie/token/secret/prompt/email stripped; bearer/JWT/long tokens masked; strings
  truncated; depth bounded).
- **/api/logs** - memory-only, no persistence, payload bounded (last 50), re-redacted at the boundary.
- **Diagnostic pack** - no secrets, cookies, Authorization, raw prompts, full stacks or fixture dumps.
- **X-Request-Id** - the server never trusts a raw client header (`resolveRequestId` validates or mints).

## Success criteria

- `flow:ai-pr-check` passes with no blocking issues.
- A downloaded diagnostic pack contains no sensitive fields.

## Common failures

- **Secret flagged** - remove it; never commit credentials. Use env vars (not committed).
- **Boundary failure** - a layer reached across a forbidden edge; fix the import.

## See also

- `docs/audit/flow/ai-governance-report.md`, `packages/flow/observability/src/redact.ts`
