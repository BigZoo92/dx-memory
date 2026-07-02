/**
 * Build/CI timing metrics. These are REAL wall-clock measurements, but they cost minutes
 * and can be flaky in constrained environments, so they are OPT-IN: only collected when the
 * collector is run with `--timings`. Without the flag they are `unavailable` (with the exact
 * command to reproduce), keeping the default pass fast and deterministic.
 */
import { timeCommand } from '../lib/exec.mjs'
import { ok, unavailable, error } from '../lib/metric.mjs'

const KEYS = { build: 'buildTimeMs', typecheck: 'typecheckTimeMs', test: 'testTimeMs', lint: 'lintTimeMs' }

export function collectBuild(variant, repoRoot, { timings = false } = {}) {
  const out = {}
  for (const [step, metricKey] of Object.entries(KEYS)) {
    const cmd = variant.timings?.[step]
    if (!timings) {
      out[metricKey] = unavailable(`Opt-in — re-run with --timings to measure \`${cmd ?? step}\`.`)
      continue
    }
    if (!cmd) {
      out[metricKey] = unavailable(`No ${step} command configured for ${variant.id}.`)
      continue
    }
    const res = timeCommand(cmd, { cwd: repoRoot })
    out[metricKey] = res.ok
      ? ok(res.ms, { command: cmd })
      : error(`\`${cmd}\` exited ${res.code}${res.error ? ` (${res.error})` : ''}`, { command: cmd, ms: res.ms })
  }
  return out
}
