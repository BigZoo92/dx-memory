import type { VariantId } from '@signalops/contracts'

/**
 * Client-safe variant identity — the single value that drives the variant badge and the
 * Settings environment block. Nothing else in the UI branches on the variant. (The server
 * mirrors these in `@signalops/flow-data-access` config for `/api/health`.)
 */
export const VARIANT: {
  id: VariantId
  label: string
  datasetVersion: string
  region: string
} = {
  id: 'flow',
  label: 'Variant B — Flow',
  datasetVersion: 'v2.4.0',
  region: 'eu-west-1'
}

export const BUILD_INFO = 'SignalOps · flow · build local · v1.0.0'
