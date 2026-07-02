// Overfit AI-change governance. In a balanced variant an AI task is "make the change and run the
// tests". Overfit wraps every AI change in a manifest, a policy score, a generated-code label, a
// forbidden-files guard and reviewer/ownership matrices. This is the "too governed" pillar.

export interface AiTaskManifest {
  task: string
  capability: string
  filesTouched: number
  testsImpacted: number
  errorReproSteps: number
  docsPages: number
  generatedArtifacts: string[]
  requiresHumanReview: boolean
}

/** The reference AI task used across the lab: adding the Risk trend capability. */
export const RISK_TREND_TASK_MANIFEST: AiTaskManifest = {
  task: 'Add Risk trend capability',
  capability: 'riskTrend',
  filesTouched: 41,
  testsImpacted: 72,
  errorReproSteps: 9,
  docsPages: 8,
  generatedArtifacts: [
    'generated/overfit/openapi.json',
    'packages/overfit/contracts-generated/src/index.ts',
    'packages/overfit/generated-manifests/src/*.manifest.json'
  ],
  requiresHumanReview: true
}

export const GENERATED_CODE_LABELS = [
  'generated:openapi',
  'generated:contracts',
  'generated:manifests'
] as const

/** Paths an AI change must never touch (other variants + product source of truth). */
export const FORBIDDEN_FILES = [
  'apps/flow-app/**',
  'packages/flow/**',
  'apps/friction-web/**',
  'apps/friction-api/**',
  'docs/product/**',
  'maquettes/**'
] as const

/** Which teams must review a change touching a given area. */
export const REVIEWER_MATRIX: Record<string, string[]> = {
  'crates/overfit-domain': ['domain-team', 'staff-eng'],
  'crates/overfit-contracts': ['contracts-team', 'api-guild'],
  'generated/overfit': ['contracts-team', 'platform-team'],
  'packages/overfit/contracts-generated': ['contracts-team'],
  'packages/overfit/feature-signals': ['frontend-team', 'design-system'],
  'packages/overfit/ui': ['design-system'],
  'docs/overfit': ['tech-writing', 'staff-eng']
}

/** Directory ownership. */
export const OWNERSHIP_MATRIX: Record<string, string> = {
  'crates/overfit-domain': 'domain-team',
  'crates/overfit-application': 'platform-team',
  'crates/overfit-observability': 'observability-team',
  'crates/overfit-policies': 'governance-team',
  'packages/overfit': 'frontend-team',
  'docs/overfit': 'tech-writing'
}

export interface ChangeDescriptor {
  filesTouched: number
  crossesLayers: number
  touchesGenerated: boolean
  touchesForbidden: boolean
}

export interface PolicyScore {
  score: number
  level: 'low' | 'elevated' | 'high' | 'blocked'
  reasons: string[]
}

/** Score an AI change. Higher = more coordination cost. `blocked` if it touches forbidden files. */
export function scoreChange(change: ChangeDescriptor): PolicyScore {
  const reasons: string[] = []
  if (change.touchesForbidden) {
    return { score: 100, level: 'blocked', reasons: ['touches forbidden files (another variant or product spec)'] }
  }
  let score = 0
  score += Math.min(40, change.filesTouched)
  if (change.filesTouched > 20) reasons.push('touches more than 20 files')
  score += change.crossesLayers * 8
  if (change.crossesLayers >= 3) reasons.push('crosses 3+ architectural layers')
  if (change.touchesGenerated) {
    score += 15
    reasons.push('regenerates generated artifacts (drift check required)')
  }
  const level = score >= 60 ? 'high' : score >= 30 ? 'elevated' : 'low'
  return { score, level, reasons }
}
