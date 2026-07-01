import type { DiagnosticPack, FlowBreadcrumb, FlowLogEvent, RunCounters } from './types'
import { FLOW_VARIANT } from './types'
import { redactEvent, redactString } from './redact'
import { nowIso } from './ids'

export type DiagnosticPackInput = {
  appVersion: string
  requestId?: string
  route?: string
  health?: { status: string } | null
  demoFlags?: Record<string, boolean>
  counters: RunCounters
  logs: readonly FlowLogEvent[]
  breadcrumbs: readonly FlowBreadcrumb[]
  userAgent?: string
  notes?: string[]
}

const DEFAULT_NOTES = [
  'Local-first demo pack. Memory-only, no persistence.',
  'No secrets, cookies, Authorization, raw prompts, full stacks or fixture dumps.'
]

/**
 * Assemble a downloadable diagnostic pack from the current state. Logs and breadcrumbs are capped at
 * the last 20 and re-redacted on the way out, so the exported file is safe to share in a bug report.
 */
export function buildDiagnosticPack(input: DiagnosticPackInput): DiagnosticPack {
  return {
    variant: FLOW_VARIANT,
    generatedAt: nowIso(),
    appVersion: input.appVersion,
    requestId: input.requestId,
    route: input.route,
    health: input.health ?? null,
    demoFlags: input.demoFlags ?? {},
    counters: input.counters,
    logs: input.logs.slice(-20).map(redactEvent),
    breadcrumbs: input.breadcrumbs
      .slice(-20)
      .map((crumb) => ({ ...crumb, message: redactString(crumb.message) })),
    userAgent: input.userAgent ? redactString(input.userAgent) : undefined,
    notes: input.notes ?? DEFAULT_NOTES
  }
}
