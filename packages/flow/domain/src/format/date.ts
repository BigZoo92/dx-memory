/**
 * ISO timestamp formatting shared by the table cells, signal detail, compare and timeline views.
 * UTC and locale-free so the same instant always renders the same string on server and client
 * (no hydration drift). Pure — no DOM, no Intl locale dependence.
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Format an ISO timestamp as "Jun 29, 09:14" (UTC, deterministic across server/client). */
export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

/** Format an ISO timestamp as a date only, "Jun 29, 2026". */
export function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}
