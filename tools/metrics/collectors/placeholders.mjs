/**
 * Metric groups that are on the roadmap but intentionally NOT collected in this first pass.
 * We surface them explicitly (rather than hiding them) as `unavailable` with the reason and
 * the seam where each will be wired. This is the extension contract for pass 2.
 */
import { unavailable } from '../lib/metric.mjs'

export function collectNotMeasured() {
  const u = (reason) => unavailable(reason)
  return {
    docker: {
      status: 'unavailable',
      reason: 'Docker not run in this pass (not available in the collection sandbox).',
      seam: 'tools/metrics/collectors/docker.mjs — time `docker build`, read image size/layers via `docker inspect`.',
      metrics: {
        dockerBuildTimeMs: u('Docker build not executed.'),
        dockerImageKb: u('Docker image not built.'),
        dockerLayers: u('Docker image not built.'),
        containerStartMs: u('Container not started.'),
        healthcheckOk: u('Container not started.')
      }
    },
    ci: {
      status: 'unavailable',
      reason: 'CI provider API not queried in this pass.',
      seam: 'tools/metrics/collectors/ci.mjs — read GITHUB_* env + GitHub Actions API for per-job timings, success/flaky rate over last 10 runs.',
      metrics: {
        ciWallTimeMs: u('CI API not queried.'),
        ciJobs: u('CI API not queried.'),
        ciSuccessRate10: u('CI API not queried.'),
        flakyRate10: u('CI API not queried.'),
        deployTimeMs: u('CI API not queried.'),
        lastDeployStatus: u('CI API not queried.')
      }
    },
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
