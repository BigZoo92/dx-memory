/**
 * Metric groups that are on the roadmap but intentionally NOT collected in this first pass.
 * We surface them explicitly (rather than hiding them) as `unavailable` with the reason and
 * the seam where each will be wired. This is the extension contract for pass 2.
 */
import { unavailable } from '../lib/metric.mjs'

export function collectNotMeasured() {
  const u = (reason) => unavailable(reason)
  return {
    // Docker was a pass-1 placeholder; it is now REAL and variant-level — see the
    // `variant.docker.*` metrics (collector: variant-ci, produced by the CI matrix).
    runtime: {
      status: 'unavailable',
      reason: 'No deployed URLs configured; live probing skipped.',
      seam: 'tools/metrics/collectors/runtime.mjs — probe appUrl/apiUrl for healthcheck + latency percentiles.',
      metrics: {
        healthStatus: u('No deployed URL.'),
        homepageResponseMs: u('No deployed URL.'),
        apiP50Ms: u('No deployed URL.'),
        apiP95Ms: u('No deployed URL.'),
        apiP99Ms: u('No deployed URL.'),
        apiErrorRate: u('No deployed URL.')
      }
    },
    frontendErrors: {
      status: 'unavailable',
      reason: 'Playwright console/error capture not run in this pass.',
      seam: 'tools/metrics/collectors/playwright.mjs — drive the app, capture console errors/warnings, network errors, table/filter latency.',
      metrics: {
        consoleErrors: u('Playwright run required.'),
        consoleWarnings: u('Playwright run required.'),
        networkErrors: u('Playwright run required.'),
        tableRenderMs: u('Playwright run required.'),
        filterLatencyMs: u('Playwright run required.'),
        sortLatencyMs: u('Playwright run required.')
      }
    },
    axe: {
      status: 'unavailable',
      reason: 'axe-core run not executed in this pass (Lighthouse a11y score is available).',
      seam: 'tools/metrics/collectors/axe.mjs — run @axe-core/playwright, bucket violations by impact.',
      metrics: {
        axeViolations: u('axe run required.'),
        axeCritical: u('axe run required.'),
        axeSerious: u('axe run required.'),
        axeModerate: u('axe run required.')
      }
    }
  }
}
