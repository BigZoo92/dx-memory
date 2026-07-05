import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Analyst, Incident, Signal, Source, TimelineEvent } from '@signalops/contracts'
import { type Dataset, generateAll } from '@signalops/fixtures'
import { deriveRiskTrend } from '@signalops/flow-domain'

/**
 * The dataset Flow's API serves.
 *
 * Source of truth is `@signalops/fixtures` `generateAll()` — the SAME deterministic generator
 * that `pnpm fixtures:generate` writes to JSON. Generating in-process (once, memoized) keeps the
 * server free of filesystem/bundle coupling while producing byte-identical data to the JSON files
 * (same seed). `loadDatasetFromJson()` is provided for parity checks and tooling that prefer the
 * on-disk fixtures.
 */
let cached: Dataset | undefined

/** The full coherent dataset, generated once per process. */
export function getDataset(): Dataset {
  if (!cached) {
    const raw = generateAll()
    // The socle fixtures deliberately omit riskTrend (the cross-variant "cost of change"
    // capability); each variant derives it at its own data boundary. Derived once here so
    // the request path never recomputes it.
    cached = {
      ...raw,
      signals: raw.signals.map((signal) => ({
        ...signal,
        riskTrend: deriveRiskTrend(signal.riskScore)
      }))
    }
  }
  return cached
}

export function getSignals(): Signal[] {
  return getDataset().signals
}

export function getIncidents(): Incident[] {
  return getDataset().incidents
}

export function getEvents(): TimelineEvent[] {
  return getDataset().events
}

export function getAnalysts(): Analyst[] {
  return getDataset().analysts
}

export function getSources(): Source[] {
  return getDataset().sources
}

/** For tests/tooling: reset the in-process cache. */
export function resetDatasetCache(): void {
  cached = undefined
}

/**
 * Read the dataset from the JSON files produced by `pnpm fixtures:generate`. Useful for verifying
 * the in-process generator matches the committed artifacts; not used on the request path.
 */
export function loadDatasetFromJson(
  dataDir: string
): Pick<Dataset, 'signals' | 'incidents' | 'events' | 'analysts' | 'sources'> {
  const read = <T>(file: string): T => JSON.parse(readFileSync(join(dataDir, file), 'utf8')) as T
  return {
    signals: read<Signal[]>('signals.json'),
    incidents: read<Incident[]>('incidents.json'),
    events: read<TimelineEvent[]>('events.json'),
    analysts: read<Analyst[]>('analysts.json'),
    sources: read<Source[]>('sources.json')
  }
}
