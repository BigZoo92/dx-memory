/**
 * Per-run metadata: commit, branch, timestamp, CI ids, environment, and the variant's
 * deployed URLs (from config). Git is read with global/system config disabled so it works
 * in restricted/sandboxed environments; anything missing degrades to null, not a crash.
 */
import { capture } from '../lib/exec.mjs'

export function collectMetadata(variant, repoRoot, now) {
  const commit = capture('git rev-parse HEAD', { cwd: repoRoot }) || null
  const commitShort = capture('git rev-parse --short HEAD', { cwd: repoRoot }) || null
  const branch =
    process.env.GITHUB_REF_NAME ||
    capture('git rev-parse --abbrev-ref HEAD', { cwd: repoRoot }) ||
    null

  return {
    app: `signalops-${variant.id}`,
    variant: variant.id,
    label: variant.label,
    thesis: variant.thesis,
    stack: variant.stack,
    accent: variant.accent,
    commit,
    commitShort,
    branch,
    timestamp: now,
    ciPipelineId: process.env.GITHUB_RUN_ID || process.env.CI_PIPELINE_ID || null,
    ciRunNumber: process.env.GITHUB_RUN_NUMBER || null,
    environment: process.env.CI ? 'ci' : 'local',
    appUrl: variant.appUrl ?? null,
    apiUrl: variant.apiUrl ?? null
  }
}
