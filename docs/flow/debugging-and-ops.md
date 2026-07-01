# Flow — debugging & ops

Find and fix errors before users report them, correlate a request end to end, and ship/roll back
safely.

## Debug an error

Every failing request surfaces in `/ops` with a request id, and the same id appears in the server log
line and the `X-Request-Id` response header.

```bash
grep <request-id> <server-logs>
```

**Success:** the failing request is visible in `/ops`; one request id ties the UI error, the API
envelope, the server log, and the response header together. The diagnostic pack contains no secrets,
cookies, tokens, prompts, stacks, or fixture dumps.

**Common problems**
- Nothing in the error inbox → the store is memory-only, bounded to the last 100; reproduce again.
- No request id on a client error → it landed under the `unhandled` group.

## Correlate one request end to end

The request id format is `req_<uuid>`. It ties together: the UI error, `ApiError.requestId`, the
`X-Request-Id` header, the server log line, and the client log. If client and server ids differ, the
client header was malformed and the server minted a fresh one (expected and safe — use the server id).
See `packages/flow/effect/src/request-id.ts` (`resolveRequestId`).

## Release & roll back

```bash
pnpm flow:ci:full                                       # full gate incl. docker build
pnpm exec nx run flow-app:docker-build --skip-nx-cache
docker run --rm -p 3000:3000 signalops-flow:local       # smoke test
curl -fsS http://localhost:3000/api/health              # expect {"status":"ok",...}
```

**Verify after deploy:** `/api/health` returns `ok`; `/ops` Run health shows expected counters and no
critical alerts; a sampled request carries an `X-Request-Id` header.

**Roll back:** redeploy the previous image tag. There is no DB / no migrations, so rollback is a
process restart; if a single feature is at fault, revert its commit. If the image healthcheck fails,
check the server entry and `PORT` (the healthcheck pings `/api/health`). See `apps/flow-app/Dockerfile`.
