/**
 * Bundle & build-artifact metrics from the variant's build output. Compression sizes are
 * REAL: we gzip/brotli the actual emitted files with node:zlib. If the variant hasn't been
 * built, every metric degrades to `unavailable` with a clear reason (never faked).
 */
import { existsSync, readFileSync } from 'node:fs'
import { walk, classify } from '../lib/fsutil.mjs'
import { ok, unavailable, bytesToKb, gzipKb, brotliKb, round } from '../lib/metric.mjs'

export function collectBundle(variant, repoRoot) {
  const distRel = variant.dist
  const distAbs = `${repoRoot}/${distRel}`
  const unavailAll = (reason) => ({
    bundleJsKb: unavailable(reason),
    bundleJsGzipKb: unavailable(reason),
    bundleJsBrotliKb: unavailable(reason),
    bundleCssKb: unavailable(reason),
    bundleCssGzipKb: unavailable(reason),
    jsChunks: unavailable(reason),
    cssChunks: unavailable(reason),
    largestChunkKb: unavailable(reason),
    imagesKb: unavailable(reason),
    fontsKb: unavailable(reason),
    distTotalKb: unavailable(reason)
  })

  if (!existsSync(distAbs)) {
    return {
      metrics: unavailAll(`No build output at ${distRel} — run the variant's build first.`),
      topChunks: []
    }
  }

  let jsBytes = 0
  let cssBytes = 0
  let jsGzip = 0
  let cssGzip = 0
  let jsBrotli = 0
  let imagesBytes = 0
  let fontsBytes = 0
  let totalBytes = 0
  let jsChunks = 0
  let cssChunks = 0
  const chunks = []

  for (const file of walk(distAbs)) {
    let buf
    try {
      buf = readFileSync(file)
    } catch {
      continue
    }
    const size = buf.length
    totalBytes += size
    const c = classify(file, repoRoot)
    if (c.ext === '.js' || c.ext === '.mjs') {
      jsBytes += size
      jsGzip += gzipKb(buf) * 1024
      jsBrotli += brotliKb(buf) * 1024
      jsChunks++
      chunks.push({ name: c.name, kb: bytesToKb(size), gzipKb: gzipKb(buf) })
    } else if (c.ext === '.css') {
      cssBytes += size
      cssGzip += gzipKb(buf) * 1024
      cssChunks++
    } else if (c.isImage) {
      imagesBytes += size
    } else if (c.isFont) {
      fontsBytes += size
    }
  }

  chunks.sort((a, b) => b.kb - a.kb)
  const largest = chunks[0]?.kb ?? 0

  return {
    metrics: {
      bundleJsKb: ok(bytesToKb(jsBytes)),
      bundleJsGzipKb: ok(round(jsGzip / 1024, 1)),
      bundleJsBrotliKb: ok(round(jsBrotli / 1024, 1)),
      bundleCssKb: ok(bytesToKb(cssBytes)),
      bundleCssGzipKb: ok(round(cssGzip / 1024, 1)),
      jsChunks: ok(jsChunks),
      cssChunks: ok(cssChunks),
      largestChunkKb: ok(largest),
      imagesKb: ok(bytesToKb(imagesBytes)),
      fontsKb: ok(bytesToKb(fontsBytes)),
      distTotalKb: ok(bytesToKb(totalBytes))
    },
    topChunks: chunks.slice(0, 12)
  }
}
