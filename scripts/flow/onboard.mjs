// pnpm flow:onboard — get a new developer from clone to running app. Safe by default: it never
// auto-installs dependencies (that is an explicit `pnpm install`); it checks, generates fixtures and
// points at the next commands.
import { existsSync } from 'node:fs'
import { section, ok, warn, info, run, runQuiet } from './lib/sh.mjs'

section('Flow onboarding')

// 1. Environment check (non-fatal here so onboarding always prints the next steps).
if (!runQuiet('node scripts/flow/doctor.mjs')) {
  warn('doctor reported issues above — resolve the blocking ones before continuing')
}

// 2. Dependencies (do NOT auto-install — just guide).
if (existsSync('node_modules')) {
  ok('dependencies installed')
} else {
  warn('dependencies not installed — run `pnpm install` (not done automatically), then re-run onboard')
}

// 3. Deterministic dataset (safe, offline, no network).
if (existsSync('node_modules')) {
  section('Generating fixtures')
  run('pnpm fixtures:generate')
}

// 4. Next steps.
section('Next steps')
console.log('  pnpm flow:dev          start the app at http://localhost:3000')
console.log('  pnpm flow:ci:fast      fast checks (lint + typecheck + tests + boundaries)')
console.log('  pnpm flow:ai-pr-check  run the AI-PR governance checks on your changes')
console.log('')
info('Local dev:  docs/flow/local-development.md')
info('All docs:   docs/flow/README.md')
