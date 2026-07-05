// Shared-ish helpers. Some of these are also re-declared inline inside individual pages
// (formatSeverity in particular) - not ideal, but it works.

import type { Severity, SignalStatus, SignalSource, IncidentImpact } from './types'

export function formatSeverity(s: Severity): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function formatStatus(s: SignalStatus): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const SOURCE_LABELS: Record<SignalSource, string> = {
  web: 'Web',
  social: 'Social',
  internal: 'Internal',
  partner: 'Partner',
  api: 'API',
  manual: 'Manual'
}

export function formatSource(s: SignalSource): string {
  return SOURCE_LABELS[s]
}

// Hue names map to CSS classes badge--<hue>. Text label is ALWAYS rendered too (a11y baseline).
export function severityHue(s: Severity): string {
  return s === 'critical' ? 'red' : s === 'high' ? 'orange' : s === 'medium' ? 'amber' : 'blue'
}

export function statusHue(s: SignalStatus): string {
  if (s === 'resolved') return 'green'
  if (s === 'investigating') return 'orange'
  if (s === 'triaged') return 'amber'
  if (s === 'dismissed') return 'grey'
  return 'blue'
}

// Risk trend labels/hues. The trend itself is derived server-side from the risk score
// (>= 80 up, <= 35 down) - the frontend just formats whatever the API sends.
export function formatRiskTrend(t: 'up' | 'stable' | 'down'): string {
  return t === 'up' ? 'Rising' : t === 'down' ? 'Falling' : 'Stable'
}

export function riskTrendHue(t: 'up' | 'stable' | 'down'): string {
  // Rising risk is bad (red), falling is good (green), stable is neutral (grey).
  return t === 'up' ? 'red' : t === 'down' ? 'green' : 'grey'
}

export function riskTrendArrow(t: 'up' | 'stable' | 'down'): string {
  return t === 'up' ? '▲' : t === 'down' ? '▼' : '▬'
}

export function impactHue(i: IncidentImpact): string {
  if (i === 'security') return 'red'
  if (i === 'business') return 'green'
  if (i === 'user') return 'blue'
  return 'grey'
}

export function incidentStatusLabel(s: string): string {
  if (s === 'in_progress') return 'In progress'
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function confidenceLabel(confidence: number | null): string {
  if (confidence === null || Number.isNaN(confidence)) return 'Unavailable'
  const c = Math.min(1, Math.max(0, confidence))
  if (c >= 0.66) return 'High'
  if (c >= 0.33) return 'Medium'
  return 'Low'
}

export function confidencePercent(confidence: number | null): number {
  if (confidence === null) return 0
  return Math.round(Math.min(1, Math.max(0, confidence)) * 100)
}

export function riskColor(score: number): string {
  if (score >= 80) return 'var(--so-red-fg)'
  if (score >= 55) return 'var(--so-accent)'
  if (score >= 30) return 'var(--so-amber-fg)'
  return 'var(--so-blue-fg)'
}

const MINUTE = 60000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0m'
  const days = Math.floor(ms / DAY)
  const hours = Math.floor((ms % DAY) / HOUR)
  const minutes = Math.floor((ms % HOUR) / MINUTE)
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  return `${minutes}m`
}

export function ageSince(createdAt: string, now: number): string {
  return formatDuration(now - Date.parse(createdAt))
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toISOString().slice(0, 10) + ' ' + d.toISOString().slice(11, 16)
}
