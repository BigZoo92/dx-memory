import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..', '..')

// The dashboard consumes the collector's output directly (no copy step) via the `@metrics`
// alias. server.fs.allow is widened to the repo root so Vite can serve that JSON in dev.
export default defineConfig({
  root: here,
  plugins: [react()],
  resolve: {
    alias: {
      '@metrics': resolve(repoRoot, 'tools/metrics/results/summary/latest.json')
    }
  },
  server: {
    fs: { allow: [repoRoot] }
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 900
  }
})
