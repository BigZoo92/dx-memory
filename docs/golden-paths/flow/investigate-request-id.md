# Investigate a request id

Correlate a single request across the client, the API envelope and the server logs.

## Background

Every request carries one id. The client sends `X-Request-Id`; the server validates it (and mints a
fresh one if absent/invalid - it never trusts a raw header), echoes it on the `X-Request-Id` response
header, and includes it in the `ApiError` body. The id format is `req_<uuid>`.

## Steps

1. Get the id from the user (the error screen shows "Request ID: req_..."), or from `/ops`.
2. In `/ops`, find the row with that request id (copy button on the badge).
3. Cross-check the server log event (same id, with route/method/status/durationMs).
4. If you only have the HTTP response, read the `X-Request-Id` header or the `requestId` field.

## Success criteria

- One id ties together: the UI error, the `ApiError.requestId`, the `X-Request-Id` header, the server
  log and the client log.

## Common failures

- **Id differs between client and server** - the client header was malformed, so the server minted a
  new one (expected, safe). Use the server id from the response.

## See also

- `packages/flow/effect/src/request-id.ts` (resolveRequestId)
- `docs/golden-paths/flow/debug-flow-error.md`
