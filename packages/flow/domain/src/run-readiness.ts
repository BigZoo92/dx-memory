/**
 * Run-readiness metrics for the DX Metrics Run axis.
 *
 * Detect / diagnose / repair times are SEED values (demo placeholders, labelled as such in the UI):
 * the lab has no historical incident data to compute a real MTTD/MTTR from. The error / timeout /
 * retry / requestId-coverage counters are computed live from the observability store by the feature;
 * this framework-free module owns only the pure types, the seed and a small formatter.
 */
export type RunReadinessSeed = {
  /** Mean time to detect (seconds). */
  mttdSeconds: number
  /** Time to diagnose once detected (seconds). */
  timeToDiagnoseSeconds: number
  /** Mean time to repair, simulated (seconds). */
  mttrSeconds: number
}

export const RUN_READINESS_SEED: RunReadinessSeed = {
  mttdSeconds: 25,
  timeToDiagnoseSeconds: 90,
  mttrSeconds: 540
}

export function formatDurationSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return rest === 0 ? `${minutes}m` : `${minutes}m ${rest}s`
}
