# friction-api

Backend for the Friction variant. NestJS.

## Commands

```
pnpm --filter @signalops/friction-api build
pnpm --filter @signalops/friction-api start
pnpm --filter @signalops/friction-api dev
pnpm --filter @signalops/friction-api test
```

Runs on port 3101.

The data is generated in memory (see `src/dataset.ts`). Types are in `src/types.ts`. The rest is
in the controllers and `src/helpers.ts`.
