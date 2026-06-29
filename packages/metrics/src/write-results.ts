/**
 * CLI entry for `pnpm metrics:collect`.
 *
 * Collects DX metrics (seed values in this pass) and writes:
 *   results/results.json     — full results (variants + winners)
 *   results/<variant>.json   — one file per variant (per measurement protocol)
 *   results/summary.json     — source, generatedAt and per-metric winners
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { collectMetrics } from './collect'

const here = dirname(fileURLToPath(import.meta.url))
const resultsDir = join(here, '..', 'results')

function writeJson(file: string, data: unknown): void {
  writeFileSync(join(resultsDir, file), `${JSON.stringify(data, null, 2)}\n`, 'utf8')
  console.log(`  ✓ ${file}`)
}

function main(): void {
  console.log('Collecting SignalOps DX metrics…')
  mkdirSync(resultsDir, { recursive: true })

  const results = collectMetrics()

  writeJson('results.json', results)
  for (const variant of results.variants) {
    writeJson(`${variant.variant}.json`, variant)
  }
  writeJson('summary.json', {
    generatedAt: results.generatedAt,
    source: results.source,
    seed: results.seed,
    winners: results.winners.map((w) => ({
      metric: w.metric,
      bestVariant: w.bestVariant,
      bestValue: w.bestValue
    }))
  })

  console.log(`\nDone — source=${results.source}, ${results.variants.length} variants.`)
}

main()
