/**
 * Delivery-surface metrics, parsed from each variant's REAL deployment artifacts:
 * its Dockerfiles (declared in variants.config.json and shipped by release.yml /
 * docker-compose.prod.yml). Everything here is static, deterministic and
 * variant-agnostic — a service is a Dockerfile, a guarded service is a Dockerfile
 * with a HEALTHCHECK, a diagnosable service is one whose deployment healthcheck
 * targets a dedicated health endpoint (a path containing "health") rather than
 * merely probing the root page.
 *
 * Why these signals:
 *   • ship.services.count — every extra image is an extra build, push, deploy and
 *     coordination step. More services is a shipping COST, never a bonus.
 *   • ship.healthcheck.coverage — a deploy you can trust is one the platform can
 *     verify. Coverage = HEALTHCHECKed Dockerfiles ÷ Dockerfiles.
 *   • run.inspection.surfaces — when production misbehaves, this is how many
 *     runtimes you must inspect before you can even localize the fault.
 *   • run.health.coverage — share of the variant's services that expose a real,
 *     dedicated health endpoint. Detected two ways, both from real artifacts:
 *     the service's own HEALTHCHECK targets a health path, OR the service's
 *     source tree defines a health route (a non-test code file named after it,
 *     e.g. routes/api/health.ts / health.controller.ts).
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, dirname, extname } from 'node:path'
import { ok, unavailable, round } from '../lib/metric.mjs'

/** Extract the HEALTHCHECK instruction (with its CMD continuation lines) from a Dockerfile, or null. */
function parseHealthcheck(content) {
  const lines = content.split(/\r?\n/)
  const start = lines.findIndex((l) => /^HEALTHCHECK\b/.test(l))
  if (start === -1) return null
  // Follow backslash continuations so the CMD line (the probed URL) is part of the instruction.
  let out = lines[start]
  let i = start
  while (/\\\s*$/.test(lines[i]) && i + 1 < lines.length) {
    i++
    out += `\n${lines[i]}`
  }
  if (/^HEALTHCHECK\s+NONE/i.test(out)) return null
  return out
}

/** Does this healthcheck hit a dedicated health endpoint (vs just probing the root page)? */
function targetsHealthEndpoint(healthcheck) {
  return /health/i.test(healthcheck.replace(/^HEALTHCHECK/i, ''))
}

const CODE_EXTS = new Set(['.ts', '.tsx', '.rs', '.js', '.mjs'])
const SKIP_DIRS = new Set(['node_modules', 'dist', 'dist-types', '.next', 'target', 'tests', '__tests__', 'coverage'])

/** Does the service's source tree define a health route (health-named, non-test code file)? */
function definesHealthRoute(serviceDir) {
  const stack = [serviceDir]
  while (stack.length) {
    const dir = stack.pop()
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name) && !e.name.startsWith('.')) stack.push(join(dir, e.name))
        continue
      }
      if (!CODE_EXTS.has(extname(e.name))) continue
      if (/\.(test|spec)\./.test(e.name)) continue
      if (/health/i.test(e.name)) return true
    }
  }
  return false
}

export function collectDelivery(variant, repoRoot) {
  const dockerfiles = Array.isArray(variant.dockerfiles) ? variant.dockerfiles : []
  if (dockerfiles.length === 0) {
    const reason = 'No Dockerfile declared for this variant — deployment surface not measurable.'
    return {
      'ship.services.count': unavailable(reason),
      'ship.healthcheck.coverage': unavailable(reason),
      'run.inspection.surfaces': unavailable(reason),
      'run.health.coverage': unavailable(reason)
    }
  }

  const services = dockerfiles.map((rel) => {
    const abs = join(repoRoot, rel)
    if (!existsSync(abs)) return { dockerfile: rel, exists: false, healthcheck: null }
    const hc = parseHealthcheck(readFileSync(abs, 'utf8'))
    return {
      dockerfile: rel,
      exists: true,
      healthcheck: hc != null,
      healthEndpoint: (hc != null && targetsHealthEndpoint(hc)) || definesHealthRoute(dirname(abs))
    }
  })

  const present = services.filter((s) => s.exists)
  if (present.length === 0) {
    const reason = `Declared Dockerfiles not found: ${dockerfiles.join(', ')}.`
    return {
      'ship.services.count': unavailable(reason),
      'ship.healthcheck.coverage': unavailable(reason),
      'run.inspection.surfaces': unavailable(reason),
      'run.health.coverage': unavailable(reason)
    }
  }

  const guarded = present.filter((s) => s.healthcheck).length
  const diagnosable = present.filter((s) => s.healthEndpoint).length
  const detail = { services: present.map(({ dockerfile, healthcheck, healthEndpoint }) => ({ dockerfile, healthcheck, healthEndpoint })) }

  return {
    'ship.services.count': ok(present.length, detail),
    'ship.healthcheck.coverage': ok(round((guarded / present.length) * 100, 0), detail),
    'run.inspection.surfaces': ok(present.length, detail),
    'run.health.coverage': ok(round((diagnosable / present.length) * 100, 0), detail)
  }
}
