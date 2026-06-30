import { Context, Effect, Layer } from 'effect'
import type { HealthResponse } from '@signalops/contracts'
import { API_VERSION, DATASET_VERSION, VARIANT_LABEL } from '../config'

/** `GET /api/health` payload. Reads `process.uptime()`, so it is genuinely effectful. */
export function buildHealthResponse(): HealthResponse {
  return {
    status: 'ok',
    version: API_VERSION,
    variant: VARIANT_LABEL,
    datasetVersion: DATASET_VERSION,
    uptimeSeconds: Math.round(process.uptime())
  }
}

export interface HealthServiceShape {
  readonly build: Effect.Effect<HealthResponse>
}

export class HealthService extends Context.Tag('@signalops/flow/HealthService')<
  HealthService,
  HealthServiceShape
>() {}

export const HealthServiceLive = Layer.succeed(
  HealthService,
  HealthService.of({ build: Effect.sync(buildHealthResponse) })
)
