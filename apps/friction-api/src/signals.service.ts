import { Injectable } from '@nestjs/common'
import { getDataset } from './dataset'
import { querySignals } from './helpers'
import { notFound } from './errors'
import type { Paginated, Signal, SignalsQuery, SignalDetailResponse, TimelineEvent } from './types'

@Injectable()
export class SignalsService {
  list(query: SignalsQuery): Paginated<Signal> {
    const { signals } = getDataset()
    return querySignals(signals, query)
  }

  getOne(id: string): SignalDetailResponse {
    const { signals, incidents } = getDataset()
    const signal = signals.find((s) => s.id === id)
    if (!signal) notFound('Signal', id)
    const linkedIncident = incidents.find((i) => i.linkedSignalIds.includes(id)) || null
    return { signal, linkedIncident }
  }

  events(id: string): TimelineEvent[] {
    const { signals, events } = getDataset()
    if (!signals.some((s) => s.id === id)) notFound('Signal', id)
    return events
      .filter((e) => e.signalId === id)
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0))
  }
}
