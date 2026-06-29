/**
 * Duration formatting shared by the dashboard KPIs and the incidents "open for" column.
 * Pure and locale-free so the same milliseconds always render the same string.
 */

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

/** Format a duration as a compact "Xd Yh" / "Xh Ym" / "Xm" string. */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0m'
  const days = Math.floor(ms / DAY_MS)
  const hours = Math.floor((ms % DAY_MS) / HOUR_MS)
  const minutes = Math.floor((ms % HOUR_MS) / MINUTE_MS)

  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  return `${minutes}m`
}

/** Age of an item created at `createdAt`, relative to `now` (both ISO or ms). */
export function ageSince(createdAt: string, now: number): string {
  return formatDuration(now - Date.parse(createdAt))
}
