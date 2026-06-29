import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'

// TanStack Start app. `tanstackStart()` wires the file-based router plugin + SSR/Nitro build;
// it must come before `@vitejs/plugin-react`. Scaffolded following the official
// "Build from scratch" guide (https://tanstack.com/start/latest/docs/framework/react/build-from-scratch).
export default defineConfig({
  server: { port: 3000 },
  plugins: [tanstackStart(), react()]
})
