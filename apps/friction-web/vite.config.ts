/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Nothing fancy here. Dev server proxies /api to the NestJS backend.
export default defineConfig({
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
