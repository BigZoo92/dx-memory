# friction-web

Frontend for the Friction variant. React + Vite.

## Commands

```
pnpm --filter @signalops/friction-web dev
pnpm --filter @signalops/friction-web build
pnpm --filter @signalops/friction-web test
```

Dev server runs on port 3100 and proxies `/api` to the backend on 3101, so start friction-api too.

Pages are in `src/pages`. Shared bits are in `src/components.tsx`, `src/helpers.ts`, `src/types.ts`.
