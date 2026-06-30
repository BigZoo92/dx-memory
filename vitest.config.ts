import { defineConfig } from 'vitest/config'

/**
 * Root Vitest config — used only for the workspace-wide run
 * (`pnpm exec vitest run --coverage --coverage.provider=v8`).
 *
 * It composes every project via `test.projects` (the replacement for the deprecated
 * `vitest.workspace.ts`), so each project keeps its OWN environment: the flow packages and the app
 * each bring their happy-dom / node config + setup files, and the shared socle packages run under a
 * plain node project here. This is what fixes the previous global "document is not defined" — React
 * tests now resolve a DOM environment instead of inheriting a single node environment for the whole
 * repo. Per-project `nx test` targets are unaffected (they still use each package's own config).
 */
export default defineConfig({
  test: {
    projects: [
      // Flow packages + the app each carry their own environment (happy-dom / node) and setup files.
      'packages/flow/*/vitest.config.ts',
      'apps/flow-app/vitest.config.ts',
      // Shared socle packages have no per-package config — they are pure node tests.
      {
        test: {
          name: 'shared',
          environment: 'node',
          passWithNoTests: true,
          include: ['packages/{contracts,fixtures,metrics,test-scenarios,ui-spec}/src/**/*.test.ts']
        }
      }
    ],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage'
    }
  }
})
