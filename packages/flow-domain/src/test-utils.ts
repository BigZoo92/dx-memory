import type { Incident, Signal } from '@signalops/contracts'

/** Build a Signal with sensible defaults; override only what a test cares about. */
export function makeSignal(overrides: Partial<Signal> = {}): Signal {
  return {
    id: 'sig_00001',
    title: 'Unusual authentication pattern detected',
    description: 'desc',
    severity: 'medium',
    status: 'new',
    source: 'internal',
    confidence: 0.5,
    riskScore: 50,
    region: 'EU-West',
    assignedTo: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    tags: [],
    hasLinkedIncident: false,
    ...overrides
  }
}

/** Build an Incident with sensible defaults. */
export function makeIncident(overrides: Partial<Incident> = {}): Incident {
  return {
    id: 'inc_001',
    title: 'Partner API degradation',
    severity: 'high',
    status: 'open',
    linkedSignalIds: [],
    owner: 'ana_001',
    createdAt: '2026-06-01T00:00:00.000Z',
    resolvedAt: null,
    impact: 'system',
    ...overrides
  }
}
