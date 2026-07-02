import type { Metric } from '../types'

/** Format a numeric metric value with its unit, compactly and readably. */
export function formatValue(value: number | string | null, unit: string | null): string {
  if (value == null) return '—'
  if (typeof value === 'string') return value
  switch (unit) {
    case 'ms':
      return value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}s` : `${Math.round(value)}ms`
    case 'kb':
      return value >= 1024 ? `${(value / 1024).toFixed(1)} MB` : `${fmtNum(value)} KB`
    case 'loc':
      return fmtNum(value)
    case 'score':
      return `${Math.round(value)}`
    case 'ratio':
      return value <= 1 ? `${Math.round(value * 100)}%` : value.toFixed(2)
    case '%':
      return `${Math.round(value)}%`
    case 'mg':
      return `${fmtNum(value)} mg`
    case 'index':
      return value < 10 ? value.toFixed(2) : fmtNum(value)
    case 'count':
    default:
      return fmtNum(value)
  }
}

export function fmtNum(n: number): string {
  if (Math.abs(n) >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100)
}

export function metricText(m: Metric | undefined): string {
  if (!m) return '—'
  if (m.status !== 'ok') return m.status === 'unavailable' ? 'pending' : 'error'
  return formatValue(m.value, m.unit)
}

export function directionLabel(direction: string): string {
  if (direction === 'lower') return 'lower is better'
  if (direction === 'higher') return 'higher is better'
  if (direction === 'balance') return 'a healthy middle is best'
  return 'informational'
}

export function directionArrow(direction: string): string {
  if (direction === 'lower') return '↓'
  if (direction === 'higher') return '↑'
  if (direction === 'balance') return '◎'
  return '·'
}

export function relativeTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
}
