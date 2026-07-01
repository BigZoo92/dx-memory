# Release and roll back Flow

Ship the Docker image and recover fast.

## Release

```bash
pnpm flow:ci:full                                   # full gate incl. docker build
pnpm exec nx run flow-app:docker-build --skip-nx-cache
docker run --rm -p 3000:3000 signalops-flow:local   # smoke test
curl -fsS http://localhost:3000/api/health          # expect {"status":"ok",...}
```

## Verify after deploy

- `/api/health` returns `ok`.
- `/ops` Run health shows expected counters; no critical alerts.
- A sampled request carries an `X-Request-Id` header.

## Roll back

- Redeploy the previous image tag (the image is the unit of rollback).
- The app is stateless and memory-only (no DB, no migrations), so rollback is a process restart - no
  data migration to reverse.
- If a single feature is at fault, revert its commit; routes are independent lazy chunks.

## Success criteria

- Health is green within the container start period; the Docker `HEALTHCHECK` passes.
- Logs/alerts in `/ops` return to baseline after rollback.

## Common failures

- **Image healthcheck fails** - check the server entry and `PORT`; the healthcheck pings `/api/health`.

## See also

- `apps/flow-app/Dockerfile`, `docs/golden-paths/flow/run-flow-ci-locally.md`
