# Bundle check (Flow)

Keep the client bundle honest.

## Steps

```bash
pnpm analyze:flow     # ANALYZE=true build -> docs/audit/flow/bundle-stats.after.{html,json,md}
```

Then verify the guardrails:

```bash
for n in server-data-access fixtures/data @effect/platform-node observabilityLoggerLayer; do
  echo "$n: $(grep -rl "$n" apps/flow-app/dist/client | wc -l) file(s)"
done   # each must be 0
ls apps/flow-app/dist/client/assets | grep -E 'ops-|signals-'   # ops + signals are separate lazy chunks
```

## Budget

- Observability core added to the client: small (a few KB gzip) - it is framework-free and imported by
  api-client + the global handlers.
- `/ops` is a lazy route chunk (~2-3 KB gzip) and must not load on other routes.
- The Effect logger adapter (`@signalops/flow-observability/effect`) must NOT appear in `dist/client`
  (it is server-only).
- Table/Virtual stay lazy on `/signals`.

## Success criteria

- All four greps return 0.
- `/ops` and `signals` are distinct chunks.
- No unexpected jump in the main `index-*.js` chunk vs the previous report.

## See also

- `docs/audit/flow/run-observability-bundle-report.md`, `apps/flow-app/vite.config.ts`
