import type { VariantId } from '@signalops/contracts'

/**
 * Single source of truth for Flow's variant identity and environment values. The variant badge,
 * `/api/health` and the Settings screen all read from here — nothing else in the app branches on
 * the variant (the only allowed visible difference between variants).
 */
export const VARIANT_ID: VariantId = 'flow'
export const VARIANT_LABEL = 'Variant B — Flow'
export const API_VERSION = '1.0.0'
export const DATASET_VERSION = 'v2.4.0'
export const REGION = 'eu-west-1'
