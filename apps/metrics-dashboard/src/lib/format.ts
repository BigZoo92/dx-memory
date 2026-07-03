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

/** A human wall-clock duration from milliseconds: "42s", "3m 12s", "1h 04m". */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '—'
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  if (m < 60) return `${m}m ${String(rem).padStart(2, '0')}s`
  const h = Math.floor(m / 60)
  return `${h}h ${String(m % 60).padStart(2, '0')}m`
}

/** Bytes → compact "1.2 MB" / "340 KB" / "512 B". */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return '—'
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${bytes} B`
}

/** Short, calendar-relative timestamp: "Jul 2, 14:32". */
export function shortTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
