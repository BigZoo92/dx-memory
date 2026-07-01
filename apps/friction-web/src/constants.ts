// App constants. The variant label is the only thing that visibly differs from the other variants.
export const VARIANT_LABEL = 'Variant A — Friction'
export const BUILD_INFO = 'SignalOps · friction · build local · v1.0.0'

// Product nav (Ops is intentionally not in the product nav).
export const NAV = [
  { to: '/', label: 'Overview', icon: 'overview' },
  { to: '/signals', label: 'Signals', icon: 'signals' },
  { to: '/incidents', label: 'Incidents', icon: 'incidents' },
  { to: '/compare', label: 'Compare', icon: 'compare' },
  { to: '/dx-metrics', label: 'DX Metrics', icon: 'dx-metrics' },
  { to: '/settings', label: 'Settings', icon: 'settings' }
] as const

// Filter option lists (also partly re-declared where used).
export const SEVERITIES = ['low', 'medium', 'high', 'critical']
export const STATUSES = ['new', 'triaged', 'investigating', 'resolved', 'dismissed']
export const SOURCES = ['web', 'social', 'internal', 'partner', 'api', 'manual']
export const IMPACTS = ['user', 'system', 'security', 'business']
export const INCIDENT_STATUSES = ['open', 'in_progress', 'resolved']

export const FEATURE_FLAGS = [
  { key: 'ai', label: 'AI recommendations', on: true },
  { key: 'grouping', label: 'Incident grouping', on: true },
  { key: 'dense', label: 'Dense tables', on: true },
  { key: 'autoEscalation', label: 'Auto-escalation', on: false },
  { key: 'experimentalScoring', label: 'Experimental scoring', on: false }
]
