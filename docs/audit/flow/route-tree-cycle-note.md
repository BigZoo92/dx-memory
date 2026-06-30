# Flow — `routeTree.gen.ts` cycle note

## The cycle Madge reported

```
apps/flow-app/src/routeTree.gen.ts > apps/flow-app/src/router.tsx
```

`router.tsx` imports `routeTree` from `routeTree.gen.ts`, and the generated tree references the
router types back — a **by-design** cycle in the TanStack Router generated artifact. The TanStack
team treats this as acceptable (the generated file even ships with `/* eslint-disable */` +
`// @ts-nocheck` and the docs explicitly say to exclude it from linters/checkers — see
TanStack Router issue #2755).

## Why we do not "fix" it

`routeTree.gen.ts` is **generated** by the TanStack Router/Start Vite plugin and is overwritten on
every `vite build`. Hand-editing it (or restructuring `router.tsx` to break the cycle) would fight
the framework and be undone on the next build. The correct, framework-endorsed action is to
**exclude the generated file from the circular-dependency check**.

## How we exclude it

`pnpm audit:flow:cycles` runs Madge across the real (hand-written) source of the app and every
`packages/flow/*` package, excluding the generated tree:

```bash
madge apps/flow-app/src packages/flow/*/src \
  --extensions ts,tsx \
  --ts-config tsconfig.base.json \
  --exclude 'routeTree\.gen\.ts' \
  --circular
```

The same exclusion is applied in `.dependency-cruiser.cjs`
(`options.exclude.path = 'routeTree\\.gen\\.ts$'`), so the `no-circular` boundary rule does not
flag it either.

## Result

```
Processed 184 files
✔ No circular dependency found!
```

Zero circular dependencies across all hand-written Flow source. The only cycle in the repository is
the generated TanStack route tree, which is excluded by design.
