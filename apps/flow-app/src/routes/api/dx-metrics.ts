import '@tanstack/react-start/server-only'
import { join } from 'node:path'
import { createFileRoute } from '@tanstack/react-router'
import { getDxMetricsEffect } from '@signalops/flow-server-data-access'
import { handleEffect } from '../../server/respond'

// Collected metrics live in the metrics package's results dir (written by `pnpm metrics:collect`).
// Overridable via env; when the file is absent (e.g. in the container) the service falls back to
// seed values and marks `source: 'seed'`.
const resultsPath =
  process.env.METRICS_RESULTS_PATH ??
  join(process.cwd(), '../../packages/metrics/results/results.json')

export const Route = createFileRoute('/api/dx-metrics')({
  server: {
    handlers: {
      GET: ({ request }) => handleEffect(getDxMetricsEffect({ resultsPath }), request)
    }
  }
})
