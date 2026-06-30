import { useCallback, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'

/**
 * Client-side demo controls. These back the Settings "Demo controls" so the toggles have a
 * REAL, visible effect across the app rather than only a banner:
 *
 * - `slowNetwork` — every API request waits {@link SLOW_NETWORK_DELAY_MS} before resolving, so
 *   the app's loading / slow-network states actually show.
 * - `forceError` — data requests reject with a simulated `ApiError`, driving the partial-error /
 *   global-error states. `/api/health` is intentionally exempt so the app shell stays usable.
 *
 * State is a tiny module-level store exposed to React via `useSyncExternalStore`.
 */
export const SLOW_NETWORK_DELAY_MS = 3000

export type DemoControls = {
  slowNetwork: boolean
  forceError: boolean
}

const DEFAULTS: DemoControls = { slowNetwork: false, forceError: false }

let state: DemoControls = DEFAULTS
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function getDemoControls(): DemoControls {
  return state
}

export function setDemoControl<K extends keyof DemoControls>(key: K, value: DemoControls[K]): void {
  state = { ...state, [key]: value }
  emit()
}

export function resetDemoControls(): void {
  state = DEFAULTS
  emit()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * React binding for the demo controls. Mutating a control invalidates the query cache so the
 * effect is immediate (widgets refetch and either slow down or fail). Used by the Settings screen.
 */
export function useDemoControls() {
  const queryClient = useQueryClient()
  const controls = useSyncExternalStore(subscribe, getDemoControls, getDemoControls)

  const setControl = useCallback(
    <K extends keyof DemoControls>(key: K, value: DemoControls[K]) => {
      setDemoControl(key, value)
      void queryClient.invalidateQueries()
    },
    [queryClient]
  )

  const reset = useCallback(() => {
    resetDemoControls()
    void queryClient.invalidateQueries()
  }, [queryClient])

  return { controls, setControl, reset }
}
