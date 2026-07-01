import { describe, expect, it, vi } from 'vitest'
import { createLogStore } from './memory-store'
import { FLOW_VARIANT, type FlowLogEvent } from './types'

const event = (id: string): FlowLogEvent => ({
  id,
  timestamp: new Date().toISOString(),
  level: 'info',
  runtime: 'server',
  variant: FLOW_VARIANT,
  message: 'm'
})

describe('memory store', () => {
  it('bounds to capacity as a ring buffer', () => {
    const store = createLogStore(3)
    for (let i = 0; i < 5; i += 1) store.add(event(`e${i}`))
    expect(store.size()).toBe(3)
    expect(store.list().map((e) => e.id)).toEqual(['e2', 'e3', 'e4'])
  })

  it('notifies subscribers and invalidates the snapshot', () => {
    const store = createLogStore()
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    const before = store.getSnapshot()
    store.add(event('a'))
    expect(listener).toHaveBeenCalledTimes(1)
    expect(store.getSnapshot()).not.toBe(before)
    unsubscribe()
    store.add(event('b'))
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('clears', () => {
    const store = createLogStore()
    store.add(event('a'))
    store.clear()
    expect(store.size()).toBe(0)
  })
})
