// pnpm flow:ci [--fast|--full|--docker] — reproduce the Flow CI locally.
//   --fast  : lint + typecheck + tests + boundaries + cycles (the daily loop; no build/Chromium/docker)
//   (none)  : fast set + build + AI governance check
//   --full  : default + accessibility (Pa11y/Lighthouse, Chromium) + bundle analyze + docker
//   --docker: also build the Docker image
import { section, run, ok } from './lib/sh.mjs'

const args = process.argv.slice(2)
const fast = args.includes('--fast')
const full = args.includes('--full')
const docker = args.includes('--docker') || full

section(`Flow CI${fast ? ' — fast' : full ? ' — full' : ''}`)

// Always: lint, typecheck, tests, architecture boundaries + cycles.
run('pnpm lint')
run('pnpm typecheck')
run('pnpm test')
run('pnpm audit:flow:boundaries')
run('pnpm audit:flow:cycles')

if (fast) {
  ok('fast CI passed (lint + typecheck + tests + boundaries + cycles)')
  process.exit(0)
}

// Default + full: build + AI governance.
run('pnpm build')
run('node scripts/flow/ai-pr-check.mjs')

if (full) {
  // Accessibility uses Chromium and is heavy + optional — it never blocks the fast loop.
  run('node scripts/flow/a11y.mjs')
  run('pnpm analyze:flow')
}

if (docker) {
  run('pnpm exec nx run flow-app:docker-build --skip-nx-cache')
}

ok(`CI passed${full ? ' (full)' : ''}`)
