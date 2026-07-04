// Overfit quality gates — the registry of local checks the CI must pass. The scripts live under
// ./scripts (plain Node ESM, no deps) so they can run in any environment.

export interface QualityGate {
  id: string
  description: string
  script: string
}

export const QUALITY_GATES: QualityGate[] = [
  {
    id: 'contracts',
    description: 'Generated TS contracts match the OpenAPI document (no drift).',
    script: 'scripts/check-contracts.mjs'
  },
  {
    id: 'schema',
    description: 'Schema registry / endpoint manifest matches the OpenAPI paths.',
    script: 'scripts/check-schema.mjs'
  },
  {
    id: 'docs',
    description: 'Every required Overfit doc exists.',
    script: 'scripts/check-docs.mjs'
  },
  {
    id: 'policy',
    description: 'AI-governance policy manifest is present and complete.',
    script: 'scripts/check-policy.mjs'
  },
  {
    id: 'bundle',
    description: 'Client bundle stays under budget.',
    script: 'scripts/check-bundle.mjs'
  }
]
