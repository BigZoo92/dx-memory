import { Context, Effect, Layer } from 'effect'
import type { Analyst, Incident, Signal, Source, TimelineEvent } from '@signalops/contracts'
import { getAnalysts, getEvents, getIncidents, getSignals, getSources } from '../fixtures/dataset'

/**
 * The dataset every repository and service reads from, modeled as an injectable Effect service.
 * Each accessor is an `Effect` (not a bare array) so a repository can `yield*` it and so the whole
 * source can be swapped — `DatasetLive` in production, `makeDatasetLayer({...})` in a test — without
 * touching a single repository.
 */
export interface DatasetService {
  readonly signals: Effect.Effect<readonly Signal[]>
  readonly incidents: Effect.Effect<readonly Incident[]>
  readonly events: Effect.Effect<readonly TimelineEvent[]>
  readonly analysts: Effect.Effect<readonly Analyst[]>
  readonly sources: Effect.Effect<readonly Source[]>
}

export class Dataset extends Context.Tag('@signalops/flow/Dataset')<Dataset, DatasetService>() {}

/** Production dataset: the in-process deterministic generator (memoized in `fixtures/dataset`). */
export const DatasetLive = Layer.succeed(
  Dataset,
  Dataset.of({
    signals: Effect.sync(getSignals),
    incidents: Effect.sync(getIncidents),
    events: Effect.sync(getEvents),
    analysts: Effect.sync(getAnalysts),
    sources: Effect.sync(getSources)
  })
)

/**
 * Build a dataset layer from explicit fixtures — the seam every repository/service test plugs into.
 * Omitted collections default to empty, so a test only declares the data the case actually needs.
 */
export const makeDatasetLayer = (data: {
  signals?: readonly Signal[]
  incidents?: readonly Incident[]
  events?: readonly TimelineEvent[]
  analysts?: readonly Analyst[]
  sources?: readonly Source[]
}): Layer.Layer<Dataset> =>
  Layer.succeed(
    Dataset,
    Dataset.of({
      signals: Effect.succeed(data.signals ?? []),
      incidents: Effect.succeed(data.incidents ?? []),
      events: Effect.succeed(data.events ?? []),
      analysts: Effect.succeed(data.analysts ?? []),
      sources: Effect.succeed(data.sources ?? [])
    })
  )
