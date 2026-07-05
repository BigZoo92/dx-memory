/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const configuredBasePath = process.env.VITE_BASE_PATH ?? '/'
const basePath = configuredBasePath.endsWith('/') ? configuredBasePath : `${configuredBasePath}/`

// Nothing fancy here. Dev server proxies /api to the NestJS backend.
export default defineConfig({
  base: basePath,
  plugins: [react()],
  server: {
    port: 3100,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:3101',
        changeOrigin: true
      }
    }
  },
  // Preview needs the same /api proxy as dev: `vite preview` does not inherit server.proxy,
  // and in production the gateway does this routing. Without it the served SPA can't reach
  // the API (breaks local smoke/Lighthouse runs against the real build).
  preview: {
    port: 3100,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:3101',
        changeOrigin: true
      }
    }
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}']
  }
})
