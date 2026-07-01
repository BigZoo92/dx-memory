/**
 * Generate a correlation id for a single request. Isomorphic: `globalThis.crypto.randomUUID()`
 * exists in Node ≥ 20.11 and every browser Flow targets, so the SAME helper is used on the server
 * (per API request) and on the client (per client-originated error). Falls back to a timestamp-free
 * pseudo id only if `crypto` is somehow unavailable, so it never throws.
 */
export function makeRequestId(): string {
  const uuid =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (globalThis.crypto?.getRandomValues?.(new Uint8Array(1))?.[0] ?? 0) % 16
          const v = c === 'x' ? r : (r & 0x3) | 0x8
          return v.toString(16)
        })
  return `req_${uuid}`
}

/** The shape `makeRequestId` produces: `req_` + a uuid-ish body. Used to validate an incoming header. */
const REQUEST_ID_PATTERN = /^req_[A-Za-z0-9-]{8,64}$/

/** True when `value` looks like one of our request ids. Guards against trusting a raw client header. */
export function isValidRequestId(value: unknown): value is string {
  return typeof value === 'string' && REQUEST_ID_PATTERN.test(value)
}

/**
 * Resolve the request id for a request: reuse a client-sent id ONLY if it is well-formed, otherwise
 * mint a fresh one. The server never trusts a raw `X-Request-Id` header verbatim.
 */
export function resolveRequestId(incoming?: string | null): string {
  return isValidRequestId(incoming) ? incoming : makeRequestId()
}
