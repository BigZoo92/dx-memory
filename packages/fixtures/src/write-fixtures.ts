/**
 * CLI entry for `pnpm fixtures:generate`.
 *
 * Generates the full deterministic dataset and writes the six fixture files documented in
 * `docs/product/00-product-contract.md`. No network access, fully reproducible.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateAll } from './generate'
import { DEFAULT_SEED } from './constants'

const here = dirname(fileURLToPath(import.meta.url))
const dataDir = join(here, '..', 'data')

function writeJson(file: string, data: unknown, pretty: boolean): void {
  const path = join(dataDir, file)
  const json = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)
  writeFileSync(path, `${json}\n`, 'utf8')
  const sizeKb = Math.round(Buffer.byteLength(json) / 1024)
  console.log(`  ✓ ${file.padEnd(22)} ${String(sizeKb).padStart(7)} KB`)
}

function main(): void {
  const start = Date.now()
  console.log(`Generating SignalOps fixtures (seed ${DEFAULT_SEED})…`)
  mkdirSync(dataDir, { recursive: true })

  const data = generateAll()

  // Large datasets are written compact; small reference files stay human-readable.
  writeJson('signals.json', data.signals, false)
  writeJson('events.json', data.events, false)
  writeJson('incidents.json', data.incidents, true)
  writeJson('analysts.json', data.analysts, true)
  writeJson('sources.json', data.sources, true)
  writeJson('dx-metrics.seed.json', data.dxMetricsSeed, true)

  const linked = data.signals.filter((s) => s.hasLinkedIncident).length
  console.log(
    [
      '',
      `Done in ${Date.now() - start}ms:`,
      `  signals=${data.signals.length} (linked=${linked})`,
      `  incidents=${data.incidents.length}`,
      `  events=${data.events.length}`,
      `  analysts=${data.analysts.length}  sources=${data.sources.length}`
    ].join('\n')
  )
}

main()
