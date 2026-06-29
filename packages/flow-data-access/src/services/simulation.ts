import type { ApiError } from '@signalops/contracts'
import { simulatedError } from '../api-errors/api-error'

/** Default delay used by the "Simulate slow network" demo control (~3s, per the reference). */
export const SLOW_NETWORK_DELAY_MS = 3000

/** Await an artificial delay — backs the slow-network simulation. */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

/** The canonical `ApiError` envelope returned by `POST /api/simulate-error`. */
export function simulateErrorResponse(): ApiError {
  return simulatedError().toApiError()
}
