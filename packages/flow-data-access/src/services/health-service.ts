import type { HealthResponse } from '@signalops/contracts'
import { API_VERSION, DATASET_VERSION, VARIANT_LABEL } from '../config'

/** `GET /api/health` payload. */
export function buildHealthResponse(): HealthResponse {
  return {
    status: 'ok',
    version: API_VERSION,
    variant: VARIANT_LABEL,
    datasetVersion: DATASET_VERSION,
    uptimeSeconds: Math.round(process.uptime())
  }
}
