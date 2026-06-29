/**
 * @signalops/fixtures
 *
 * Deterministic dataset generator. Every variant builds its mock backend / API from the
 * SAME data so the comparison stays fair. The CLI (`pnpm fixtures:generate`) writes the
 * JSON files; this module also exposes the generators for in-process use (tests, mock APIs).
 */
export { Random } from './random'
export {
  DEFAULT_SEED,
  REFERENCE_NOW,
  WINDOW_DAYS,
  FIXTURE_COUNTS,
  DX_METRICS_SEED,
  REGIONS,
  TAGS,
  SIGNAL_TITLES,
  INCIDENT_TITLES,
  ANALYST_NAMES,
  SOURCE_DEFINITIONS
} from './constants'
export type { Dataset } from './generate'
export {
  generateAll,
  generateAnalysts,
  generateSources,
  generateSignals,
  generateIncidents,
  generateEvents
} from './generate'
