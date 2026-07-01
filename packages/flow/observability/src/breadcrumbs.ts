import type { FlowBreadcrumb } from './types'
import { nowIso } from './ids'

/** A bounded trail of recent user/app actions, attached to an event so an error has context. */
export type BreadcrumbTrail = {
  readonly capacity: number
  add(crumb: Omit<FlowBreadcrumb, 'timestamp'> & { timestamp?: string }): void
  list(): readonly FlowBreadcrumb[]
  clear(): void
  getSnapshot(): readonly FlowBreadcrumb[]
  subscribe(listener: () => void): () => void
}

export function createBreadcrumbTrail(capacity = 50): BreadcrumbTrail {
  const buffer: FlowBreadcrumb[] = []
  const listeners = new Set<() => void>()
  let snapshot: readonly FlowBreadcrumb[] | null = null

  const notify = () => {
    snapshot = null
    for (const listener of listeners) listener()
  }

  return {
    capacity,
    add(crumb) {
      buffer.push({ timestamp: crumb.timestamp ?? nowIso(), ...crumb })
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
    getSnapshot() {
      if (snapshot === null) snapshot = [...buffer]
      return snapshot
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    }
  }
}

let defaultTrail: BreadcrumbTrail | null = null

export function getDefaultTrail(): BreadcrumbTrail {
  if (defaultTrail === null) defaultTrail = createBreadcrumbTrail()
  return defaultTrail
}
