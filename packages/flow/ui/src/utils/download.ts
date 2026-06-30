/**
 * Trigger a client-side file download from in-memory text. Used by the Overview and DX Metrics
 * "Export" actions so they produce a real file (CSV/JSON) instead of being decorative. Guards on
 * `document` so importing this module never throws during SSR; it only runs from a click handler.
 */
export function downloadTextFile(
  filename: string,
  content: string,
  mimeType = 'text/plain;charset=utf-8'
): void {
  if (typeof document === 'undefined') return
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
