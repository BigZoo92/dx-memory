import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const here = dirname(fileURLToPath(import.meta.url))
const configuredBasePath = process.env.VITE_BASE_PATH ?? '/metrics/'
const basePath = configuredBasePath.endsWith('/') ? configuredBasePath : `${configuredBasePath}/`

// The page only consumes the frozen benchmark truth pack (src/bench/truth-pack.json),
// regenerated explicitly via `node tools/metrics/bench-truth-pack.mjs` when the archive
// of the 12 runs changes. The build is hermetic: no live collector dependency.
export default defineConfig({
  root: here,
  base: basePath,
  plugins: [react()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 900
  }
})
