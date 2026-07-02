/**
 * Command runner used only by the opt-in timings collector. Never used by the default
 * (static) pass, so a broken tool can never take down the whole pipeline.
 */
import { spawnSync } from 'node:child_process'

/**
 * Run a shell command, returning { ok, ms, code, stdout, stderr }.
 * `ms` is wall-clock from before spawn to after exit.
 */
export function timeCommand(command, { cwd, timeoutMs = 15 * 60 * 1000, env } = {}) {
  const start = process.hrtime.bigint()
  const res = spawnSync(command, {
    cwd,
    shell: true,
    timeout: timeoutMs,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null' }
  })
  const ms = Number((process.hrtime.bigint() - start) / 1000000n)
  return {
    ok: res.status === 0 && !res.error,
    ms,
    code: res.status,
    stdout: res.stdout ?? '',
    stderr: res.stderr ?? '',
    error: res.error ? String(res.error.message ?? res.error) : null
  }
}

/** Run a command purely to capture stdout (short timeout). Returns '' on failure. */
export function capture(command, { cwd, timeoutMs = 20000 } = {}) {
  try {
    const res = spawnSync(command, {
      cwd,
      shell: true,
      timeout: timeoutMs,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
      env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null' }
    })
    if (res.status !== 0) return ''
    return (res.stdout ?? '').trim()
  } catch {
    return ''
  }
}
