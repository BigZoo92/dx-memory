import type { FlowLogEvent } from './types'

/**
 * A bounded in-memory ring buffer of log events. This is the only place events live: no persistence,
 * no SaaS, no file. The cached snapshot + listeners let a browser store drive React via
 * `useSyncExternalStore` without this package ever importing React.
 */
export type LogStore = {
  readonly capacity: number
  add(event: FlowLogEvent): void
  list(): readonly FlowLogEvent[]
  clear(): void
  size(): number
  subscribe(listener: () => void): () => void
  getSnapshot(): readonly FlowLogEvent[]
}

export function createLogStore(capacity = 100): LogStore {
  const buffer: FlowLogEvent[] = []
  const listeners = new Set<() => void>()
  let snapshot: readonly FlowLogEvent[] | null = null

  const notify = () => {
    snapshot = null
    for (const listener of listeners) listener()
  }

  return {
    capacity,
    add(event) {
      buffer.push(event)
      if (buffer.length > capacity) buffer.splice(0, buffer.length - capacity)
      notify()
    },
    list() {
      return this.getSnapshot()
    },
    clear() {
      buffer.length = 0
      notify()
    },
    size() {
      return buffer.length
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot() {
      if (snapshot === null) snapshot = [...buffer]
      return snapshot
    }
  }
}

let defaultStore: LogStore | null = null

/** Per-process default store: one instance in the browser, one in the Node server. */
export function getDefaultStore(): LogStore {
  if (defaultStore === null) defaultStore = createLogStore()
  return defaultStore
}
