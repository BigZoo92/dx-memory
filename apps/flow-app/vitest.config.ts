import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vitest config kept separate from vite.config.ts so tests don't load the TanStack Start
// SSR/Nitro plugin (which expects a server build context).
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./vitest.setup.ts']
  }
})
