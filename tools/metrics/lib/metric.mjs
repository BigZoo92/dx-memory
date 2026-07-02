/**
 * Metric value helpers.
 *
 * Every metric is an object with an explicit status so the pipeline never fakes data:
 *   - ok          → a real measurement is present
 *   - unavailable → not measurable in this run (with a human reason). Not an error.
 *   - error       → a collector tried and failed (reason carries the message).
 *
 * `unit` and `direction` are attached at scoring time from the catalog, but we also
 * carry them here for self-describing per-variant files.
 */
import { gzipSync, brotliCompressSync } from 'node:zlib'

export function ok(value, extra = {}) {
  return { value, status: 'ok', ...extra }
}

export function unavailable(reason, extra = {}) {
  return { value: null, status: 'unavailable', reason, ...extra }
}

export function error(reason, extra = {}) {
  return { value: null, status: 'error', reason, ...extra }
}

/** Round to `d` decimals. */
export function round(n, d = 0) {
  if (n === null || n === undefined || Number.isNaN(n)) return null
  const f = 10 ** d
  return Math.round(n * f) / f
}

export function bytesToKb(bytes) {
  return round(bytes / 1024, 1)
}

/** Real gzip size of a buffer/string, in KB. */
export function gzipKb(buf) {
  return bytesToKb(gzipSync(buf).length)
}

/** Real brotli size of a buffer/string, in KB. */
export function brotliKb(buf) {
  return bytesToKb(brotliCompressSync(buf).length)
}

/**
 * Run `fn` and wrap the result. If it throws, return an `error` metric map instead of
 * crashing the whole collector. `fn` returns a plain object of metric entries.
 */
export function guard(label, fn) {
  try {
    return fn()
  } catch (e) {
    return { __error: error(`${label} collector failed: ${e?.message ?? e}`) }
  }
}
