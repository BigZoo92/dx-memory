import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import type { PluginOption } from 'vite'

const shouldAnalyze = process.env.ANALYZE === 'true'

// TanStack Start app. `tanstackStart()` wires the file-based router plugin + SSR/Nitro build;
// it must come before `@vitejs/plugin-react`. Scaffolded following the official
// "Build from scratch" guide (https://tanstack.com/start/latest/docs/framework/react/build-from-scratch).
export default defineConfig({
  server: { port: 3000 },
  plugins: [
    tanstackStart(),
    react(),
    shouldAnalyze &&
      (visualizer({
        filename: '../../docs/audit/flow/bundle-stats.after.html',
        title: 'SignalOps Flow bundle (after)',
        template: 'treemap',
        gzipSize: true,
        brotliSize: true,
        open: false
      }) as PluginOption),
    shouldAnalyze &&
      (visualizer({
        filename: '../../docs/audit/flow/bundle-stats.after.json',
        title: 'SignalOps Flow bundle raw data (after)',
        template: 'raw-data',
        gzipSize: true,
        brotliSize: true,
        open: false
      }) as PluginOption),
    shouldAnalyze &&
      (visualizer({
        filename: '../../docs/audit/flow/bundle-stats.after.md',
        title: 'SignalOps Flow bundle markdown (after)',
        template: 'markdown',
        gzipSize: true,
        brotliSize: true,
        open: false
      }) as PluginOption)
  ].filter(Boolean)
  // NOTE: a manual `vendor` split was evaluated and rejected — forcing all of @tanstack into one
  // vendor chunk made Table/Virtual eager on every route (they are route-lazy by default), which
  // is a net regression for non-table pages. TanStack Router's automatic route-level splitting is
  // left in charge. See docs/flow/quality-gates.md (Bundle).
})
