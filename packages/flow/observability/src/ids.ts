/** Isomorphic, dependency-free helpers for event ids and timestamps (no `effect`, no Node APIs). */

let counter = 0

export function makeEventId(): string {
  const cryptoApi = globalThis.crypto
  if (typeof cryptoApi?.randomUUID === 'function') return `evt_${cryptoApi.randomUUID()}`
  counter += 1
  return `evt_${Date.now().toString(36)}_${counter.toString(36)}`
}

export function nowIso(): string {
  return new Date().toISOString()
}
