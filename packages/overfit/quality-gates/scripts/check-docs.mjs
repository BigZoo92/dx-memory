// Docs drift gate. Every required Overfit document must exist.
import { fileExists, pass, fail } from './_lib.mjs'

const GATE = 'docs'

const REQUIRED = [
  'docs/overfit/README.md',
  'docs/overfit/IMPLEMENTATION_REPORT.md',
  'docs/overfit/architecture/architecture-overview.md',
  'docs/overfit/architecture/boundaries.md',
  'docs/overfit/architecture/polyglot-cost.md',
  'docs/overfit/adr/0001-next-rust-polyglot.md',
  'docs/overfit/adr/0002-cqrs-event-sourcing-memory.md',
  'docs/overfit/adr/0003-openapi-generated-client.md',
  'docs/overfit/adr/0004-observability-overinvestment.md',
  'docs/overfit/runbooks/local-development.md',
  'docs/overfit/runbooks/debugging.md',
  'docs/overfit/runbooks/diagnostic-pack.md',
  'docs/overfit/policies/schema-policy.md',
  'docs/overfit/policies/release-policy.md',
  'docs/overfit/policies/observability-policy.md',
  'docs/overfit/policies/testing-policy.md',
  'docs/overfit/ai-governance/ai-policy.md',
  'docs/overfit/ai-governance/ai-change-manifest.md',
  'docs/overfit/ai-governance/reviewer-matrix.md',
  'docs/overfit/change-management/risk-trend-change-surface.md',
  'docs/overfit/quality-gates/quality-gates.md'
]

let missing = 0
for (const doc of REQUIRED) {
  if (!fileExists(doc)) {
    fail(GATE, `missing doc: ${doc}`)
    missing++
  }
}
if (missing === 0) pass(GATE, `all ${REQUIRED.length} required docs present`)

process.exit(process.exitCode ?? 0)
