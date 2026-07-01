# Add a Flow API route

Add a server endpoint under `apps/flow-app/src/routes/api/`.

## Steps

1. Create `apps/flow-app/src/routes/api/<name>.ts` with `'@tanstack/react-start/server-only'` at the top.
2. For data endpoints, write the logic as an Effect in `packages/flow/server-data-access` and expose a
   `get<Name>Effect()`; the route stays a thin wrapper.
3. In the handler, call `handleEffect(get<Name>Effect(...), request)` - passing `request` wires the
   request id (header + body) and route/method logging for free.
4. For imperative endpoints, resolve the id with `resolveRequestId(request.headers.get('x-request-id'))`,
   set the `x-request-id` response header, and log via `@signalops/flow-observability`.

## Success criteria

- Success and failure both produce a log event in `/ops` with the request id.
- The response carries the `X-Request-Id` header.
- `pnpm --filter @signalops/flow-app run typecheck` is green after `pnpm build:flow` regenerates the
  route tree.

## Common failures

- **No request id correlation** - you forgot to pass `request` to `handleEffect`.
- **Server code in the client bundle** - never import `server-data-access` outside `routes/api` or
  `server/` (enforced by `pnpm audit:flow:boundaries`).

## See also

- `apps/flow-app/src/server/respond.ts`, `packages/flow/server-data-access/src/effect/run.ts`
