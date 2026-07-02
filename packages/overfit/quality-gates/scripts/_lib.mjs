// Shared helpers for the Overfit quality-gate scripts. Plain Node ESM, no dependencies.
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { readFileSync, existsSync } from 'node:fs'

const here = dirname(fileURLToPath(import.meta.url))
// scripts dir -> packages/overfit/quality-gates/scripts ; repo root is four levels up.
export const REPO_ROOT = resolve(here, '../../../..')

export function readJson(relPath) {
  return JSON.parse(readFileSync(resolve(REPO_ROOT, relPath), 'utf8'))
}

export function fileExists(relPath) {
  return existsSync(resolve(REPO_ROOT, relPath))
}

export function readText(relPath) {
  return readFileSync(resolve(REPO_ROOT, relPath), 'utf8')
}

export function pass(gate, msg) {
  console.log(`✓ [${gate}] ${msg}`)
}

export function fail(gate, msg) {
  console.error(`✗ [${gate}] ${msg}`)
  process.exitCode = 1
}
