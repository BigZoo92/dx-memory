/**
 * @signalops/flow-effect
 *
 * Shared Effect primitives for the Flow variant. Deliberately tiny and framework-free: it depends
 * only on `effect` and `@signalops/contracts`. It owns
 *   - the typed Flow error channel (`Data.TaggedError`s + the `FlowError` union);
 *   - `makeRequestId()` (isomorphic correlation id);
 *   - `toApiErrorPayload()` — the single error → `ApiError` envelope mapping.
 *
 * Hard rule (enforced by dependency-cruiser): NO React, NO TanStack, NO fixtures, NO server
 * data-access, NO UI. Both the server (`flow-server-data-access`) and the browser
 * (`flow-api-client`) import this, so it must stay isomorphic and dependency-light.
 */
export * from './errors'
export * from './request-id'
export * from './api-error'
