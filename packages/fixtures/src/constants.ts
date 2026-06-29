import type { DxMetric } from '@signalops/contracts'

/** Fixed seed — never change without regenerating and re-measuring every variant. */
export const DEFAULT_SEED = 20260629

/**
 * Fixed "now" used as the anchor for all generated dates, so the dataset does not depend
 * on the wall clock. All dates fall within the 90 days before this instant.
 */
export const REFERENCE_NOW = Date.parse('2026-06-29T12:00:00.000Z')
export const DAY_MS = 24 * 60 * 60 * 1000
export const WINDOW_DAYS = 90

/** Required minimum volumes from `docs/product/00-product-contract.md`. */
export const FIXTURE_COUNTS = {
  signals: 10_000,
  incidents: 300,
  analysts: 25,
  sources: 12,
  events: 50_000
} as const

export const REGIONS = [
  'EU-West',
  'EU-Central',
  'US-East',
  'US-West',
  'APAC',
  'LATAM',
  'MEA',
  'UK',
  'Nordics',
  'DACH'
] as const

export const TAGS = [
  'auth',
  'export',
  'latency',
  'partner-api',
  'data-leak',
  'anomaly',
  'compliance',
  'pii',
  'rate-limit',
  'geo-mismatch',
  'automation',
  'manual-review',
  'escalation',
  'fraud',
  'integrity'
] as const

/** Sample titles seeded from the design spec, plus realistic variations. */
export const SIGNAL_TITLES = [
  'Unusual authentication pattern detected',
  'Partner API latency spike',
  'Suspicious document access',
  'Unexpected data export volume',
  'Critical workflow failure',
  'Manual review required',
  'Repeated failed exports from same region',
  'High-risk source correlation detected',
  'Anomalous login velocity',
  'Sensitive record accessed off-hours',
  'Spike in rate-limit rejections',
  'Possible PII leak in export batch',
  'Geo mismatch on partner session',
  'Automation job exceeded error budget',
  'Escalation threshold reached for source',
  'Integrity check mismatch on ingest'
] as const

export const INCIDENT_TITLES = [
  'Coordinated authentication abuse',
  'Partner data pipeline degradation',
  'Mass export anomaly under investigation',
  'Suspected insider document exfiltration',
  'Cascading workflow failure',
  'Cross-region fraud cluster',
  'Compliance breach review',
  'Rate-limit saturation incident'
] as const

export const ANALYST_NAMES = [
  'Amelia Stone',
  'Noah Bennett',
  'Priya Nair',
  'Lucas Moreau',
  'Sofia Rossi',
  'Mateo Garcia',
  'Hana Suzuki',
  'Olivier Dubois',
  'Emma Larsson',
  'Daniel Cohen',
  'Aisha Khan',
  'Liam Murphy',
  'Yuki Tanaka',
  'Clara Schmidt',
  'Diego Fernandez',
  'Maya Patel',
  'Tomas Novak',
  'Ines Costa',
  'Jonas Weber',
  'Leila Haddad',
  'Erik Johansson',
  'Nadia Petrova',
  'Samuel Adeyemi',
  'Chloe Martin',
  'Viktor Ivanov'
] as const

/** 12 concrete source instances, each mapped to one of the six `SignalSource` categories. */
export const SOURCE_DEFINITIONS = [
  { name: 'Public Web Crawler', category: 'web' },
  { name: 'Brand Mentions Feed', category: 'web' },
  { name: 'Social Listening Stream', category: 'social' },
  { name: 'Community Reports', category: 'social' },
  { name: 'Internal Audit Log', category: 'internal' },
  { name: 'Employee Activity Monitor', category: 'internal' },
  { name: 'Partner Webhook Gateway', category: 'partner' },
  { name: 'Partner Data Exchange', category: 'partner' },
  { name: 'Detection API v1', category: 'api' },
  { name: 'Detection API v2', category: 'api' },
  { name: 'Analyst Manual Entry', category: 'manual' },
  { name: 'Escalation Desk', category: 'manual' }
] as const

/**
 * SEED / DEMO DX metrics — NOT collected measurements.
 *
 * Values are transcribed from the reference table in `docs/product/01-design-spec.md`
 * (seconds → ms, durations → ms) so `/dx-metrics` has something to render before real
 * numbers are collected. Per `docs/product/02-measurement-protocol.md` these MUST be
 * replaced by collected metrics before the defense; the metrics output marks them as `seed`.
 */
export const DX_METRICS_SEED: DxMetric[] = [
  {
    variant: 'friction',
    installTimeMs: 48_000,
    typecheckTimeMs: 19_000,
    testTimeMs: 160_000,
    buildTimeMs: 72_000,
    dockerBuildTimeMs: 250_000,
    ciDurationMs: 560_000,
    bundleSizeKb: 412,
    mainChunkSizeKb: 287,
    lighthousePerformance: 71,
    tableRenderTimeMs: 480,
    filesTouchedForAiTask: 23,
    testsImpacted: 48,
    errorReproductionSteps: 7,
    docsPagesNeeded: 5,
    aiTaskResult: 'partial'
  },
  {
    variant: 'flow',
    installTimeMs: 22_000,
    typecheckTimeMs: 8_000,
    testTimeMs: 54_000,
    buildTimeMs: 38_000,
    dockerBuildTimeMs: 110_000,
    ciDurationMs: 220_000,
    bundleSizeKb: 198,
    mainChunkSizeKb: 121,
    lighthousePerformance: 94,
    tableRenderTimeMs: 120,
    filesTouchedForAiTask: 6,
    testsImpacted: 9,
    errorReproductionSteps: 2,
    docsPagesNeeded: 1,
    aiTaskResult: 'success'
  },
  {
    variant: 'overfit',
    installTimeMs: 31_000,
    typecheckTimeMs: 12_000,
    testTimeMs: 98_000,
    buildTimeMs: 26_000,
    dockerBuildTimeMs: 125_000,
    ciDurationMs: 310_000,
    bundleSizeKb: 164,
    mainChunkSizeKb: 96,
    lighthousePerformance: 97,
    tableRenderTimeMs: 90,
    filesTouchedForAiTask: 41,
    testsImpacted: 72,
    errorReproductionSteps: 9,
    docsPagesNeeded: 8,
    aiTaskResult: 'partial'
  }
]
