# @signalops/flow-effect

> Shared Effect primitives for the **Flow** variant. Isomorphic (server + browser). Part of
> `packages/flow/*`.

The smallest possible Effect package: it owns Flow's typed error channel and the single mapping from
those errors to the canonical `ApiError` wire envelope. Both `flow-server-data-access` (Node) and
`flow-api-client` (browser) import it, so it must stay **framework-free and isomorphic**.

**Boundary:** depends on `@signalops/contracts` + `effect` only. It must never import React,
TanStack, `fixtures`, `server-data-access`, `api-client`, `ui`, `domain` or `feature-*` — enforced by
`.dependency-cruiser.cjs` (`no-flow-effect-to-framework`, `no-flow-effect-to-siblings`).

## What's inside

| Module          | Responsibility                                                                |
| --------------- | ----------------------------------------------------------------------------- |
| `errors.ts`     | `Data.TaggedError` types + the closed `FlowError` union                       |
| `request-id.ts` | `makeRequestId()` — isomorphic `crypto.randomUUID` correlation id             |
| `api-error.ts`  | `toApiErrorPayload(error)` — the one error → `ApiError` envelope + status map |

## The error channel

```ts
FlowValidationError // → 400 bad_request
FlowNotFoundError // → 404 not_found
FlowApiError // → passthrough status (client-side, parsed from the envelope)
FlowNetworkError // → 502 network_error
FlowTimeoutError // → 504 timeout
FlowUnexpectedError // → 500 internal_error (opaque; never leaks a stack)
```

Every error carries a `requestId`, so one id correlates the client, the API envelope and the logs.
`toApiErrorPayload` is exhaustive over the union: adding a variant without mapping it is a compile
error.

## Why this package exists

The typed errors and their `ApiError` mapping are needed on **both** sides of the wire (the server
raises them; the client parses non-2xx envelopes back into them). Putting them in one isomorphic
package keeps the wire contract owned in exactly one place and avoids duplicating it across the
server and browser builds.

```bash
pnpm nx run flow-effect:typecheck
pnpm nx run flow-effect:test
```

See [`docs/audit/flow/effect-integration-report.md`](../../../docs/audit/flow/effect-integration-report.md)
for the full integration rationale and bundle impact.
