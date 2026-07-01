// Tiny shared helpers for the Flow one-shot scripts. No dependencies — Node built-ins only.
import { execSync } from 'node:child_process'

export const C = {
  reset: '[0m',
  red: '[31m',
  green: '[32m',
  yellow: '[33m',
  cyan: '[36m',
  dim: '[2m',
  bold: '[1m'
}

export function section(title) {
  console.log(`\n${C.bold}${C.cyan}== ${title} ==${C.reset}`)
}
export function ok(msg) {
  console.log(`${C.green}  ok${C.reset}  ${msg}`)
}
export function warn(msg) {
  console.log(`${C.yellow}warn${C.reset}  ${msg}`)
}
export function fail(msg) {
  console.log(`${C.red}fail${C.reset}  ${msg}`)
}
export function info(msg) {
  console.log(`${C.dim}  ..${C.reset}  ${msg}`)
}

/** Run a command, inheriting stdio. Throws on non-zero exit (callers decide how to handle). */
export function run(cmd) {
  execSync(cmd, { stdio: 'inherit', env: process.env })
}

/** Run a command quietly; return true on success, false on failure. */
export function runQuiet(cmd) {
  try {
    execSync(cmd, { stdio: 'ignore', env: process.env })
    return true
  } catch {
    return false
  }
}

/** Capture a command's stdout (trimmed); empty string on failure. */
export function capture(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

/** Is a binary on PATH? */
export function has(bin) {
  return runQuiet(`command -v ${bin}`)
}
