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
  preview: { port: 3100 },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}']
  }
})
