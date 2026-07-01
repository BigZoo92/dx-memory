# Debug a Flow error

Find and fix an error before the user reports it.

## Steps

1. Reproduce: from `/settings` > Demo controls, toggle **Simulate API error** (or **slow network**).
2. Open `/ops` (Operational health) - or Settings > Operational health card.
3. Read the **Error inbox**: level, route, status, error tag, count, and the **request id**.
4. Copy the request id and grep the server logs for the same id (client and server share it).
5. Check **Alerts** and **Run health** for blast radius (spike of 500s, timeouts, coverage).
6. Click **Download diagnostic pack** to attach a redacted JSON to the ticket.
7. Fix, then clear demo logs and confirm the inbox is clean.

## Success criteria

- The failing request is visible in `/ops` with a request id.
- The same request id appears in the server log line and the `X-Request-Id` response header.
- The diagnostic pack contains no secrets, cookies, tokens, prompts, stacks or fixture dumps.

## Common failures

- **Nothing in the inbox** - the store is memory-only and bounded (last 100). Reproduce again.
- **No request id on a client error** - it is an unhandled error (window.onerror); still grouped under
  `unhandled`.

## See also

- `docs/golden-paths/flow/investigate-request-id.md`
- `docs/audit/flow/observability-report.md`
