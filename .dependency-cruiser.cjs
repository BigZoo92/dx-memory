/**
 * Architecture boundary rules for the Flow variant.
 *
 * OXC stays the fast everyday linter; this is the dedicated *architecture* check (run via
 * `pnpm audit:flow:boundaries`). It fails the build if a layer reaches across a forbidden edge —
 * the rules below are the executable form of the dependency graph in
 * `docs/audit/flow/flow-boundaries.md`.
 *
 * Paths are matched as regular expressions, relative to the repo root (forward slashes).
 * TS path aliases (`@signalops/*`) are resolved via `tsconfig.base.json`.
 *
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    // ---- client / server separation --------------------------------------------------------
    {
      name: 'no-feature-to-server',
      comment:
        'Features are client-side; they must read data over HTTP (api-client), never import the server package.',
      severity: 'error',
      from: { path: '^packages/flow/feature-[^/]+/src' },
      to: { path: '^packages/flow/server-data-access/src' }
    },
    {
      name: 'no-ui-to-server',
      comment: 'UI is presentational; it must not import the server data-access package.',
      severity: 'error',
      from: { path: '^packages/flow/ui/src' },
      to: { path: '^packages/flow/server-data-access/src' }
    },
    {
      name: 'no-apiclient-to-server',
      comment: 'The browser API client talks to /api over fetch; it must not import server code.',
      severity: 'error',
      from: { path: '^packages/flow/api-client/src' },
      to: { path: '^packages/flow/server-data-access/src' }
    },
    {
      name: 'no-app-client-to-server',
      comment: 'Only the app server routes (routes/api, server/) may import the server package.',
      severity: 'error',
      from: {
        path: '^apps/flow-app/src',
        pathNot: '^apps/flow-app/src/(routes/api/|server/)'
      },
      to: { path: '^packages/flow/server-data-access/src' }
    },

    // ---- fixtures must never reach a client surface ----------------------------------------
    {
      name: 'no-ui-to-fixtures',
      comment: 'UI must not bundle the dataset generator.',
      severity: 'error',
      from: { path: '^packages/flow/ui/src' },
      to: { path: '^packages/fixtures/src' }
    },
    {
      name: 'no-apiclient-to-fixtures',
      comment: 'The API client must not bundle the dataset generator.',
      severity: 'error',
      from: { path: '^packages/flow/api-client/src' },
      to: { path: '^packages/fixtures/src' }
    },
    {
      name: 'no-feature-to-fixtures',
      comment: 'Features must not bundle the dataset generator.',
      severity: 'error',
      from: { path: '^packages/flow/feature-[^/]+/src' },
      to: { path: '^packages/fixtures/src' }
    },

    // ---- UI must not depend on the data layer ----------------------------------------------
    {
      name: 'no-ui-to-apiclient',
      comment: 'UI is data-agnostic; it receives data via props (no api-client import).',
      severity: 'error',
      from: { path: '^packages/flow/ui/src' },
      to: { path: '^packages/flow/api-client/src' }
    },

    // ---- domain must stay pure (no React, no TanStack, no UI, no fixtures) ------------------
    {
      name: 'no-domain-to-react',
      comment: 'flow-domain is framework-free: no React / React-DOM / React-Router.',
      severity: 'error',
      from: { path: '^packages/flow/domain/src' },
      to: { path: '/(react|react-dom)/' }
    },
    {
      name: 'no-domain-to-tanstack',
      comment: 'flow-domain is framework-free: no TanStack.',
      severity: 'error',
      from: { path: '^packages/flow/domain/src' },
      to: { path: '/@tanstack/' }
    },
    {
      name: 'no-domain-to-ui',
      comment: 'flow-domain must not import UI.',
      severity: 'error',
      from: { path: '^packages/flow/domain/src' },
      to: { path: '^packages/flow/ui/src' }
    },
    {
      name: 'no-domain-to-fixtures',
      comment: 'flow-domain must not import fixtures.',
      severity: 'error',
      from: { path: '^packages/flow/domain/src' },
      to: { path: '^packages/fixtures/src' }
    },
    {
      name: 'no-server-to-react',
      comment: 'flow-server-data-access is framework-free (Node server only): no React.',
      severity: 'error',
      from: { path: '^packages/flow/server-data-access/src' },
      to: { path: '/(react|react-dom)/' }
    },

    // ---- flow-effect must stay tiny and isomorphic (effect + contracts only) ----------------
    // It is imported by BOTH server (server-data-access) and client (api-client), so any leak into
    // React / TanStack / fixtures / a sibling layer would break the client/server split or bloat
    // the browser bundle. Allowed deps: @signalops/contracts and `effect`.
    {
      name: 'no-flow-effect-to-framework',
      comment: 'flow-effect must not import React or TanStack (it must stay framework-free).',
      severity: 'error',
      from: { path: '^packages/flow/effect/src' },
      to: { path: '/(react|react-dom)/|/@tanstack/' }
    },
    {
      name: 'no-flow-effect-to-siblings',
      comment:
        'flow-effect depends only on contracts + effect: not on fixtures, server-data-access, api-client, ui, features or domain.',
      severity: 'error',
      from: { path: '^packages/flow/effect/src' },
      to: {
        path: '^packages/(fixtures|flow/(server-data-access|api-client|ui|domain|feature-[^/]+))/src'
      }
    },

    // ---- UI stays data-agnostic and Effect-free (Effect must not reach the view) -------------
    {
      name: 'no-ui-to-effect-runtime',
      comment:
        'UI must not import the Effect runtime (npm `effect`) — Effect belongs at the data edges, not in components.',
      severity: 'error',
      from: { path: '^packages/flow/ui/src' },
      to: { path: '/effect/dist/' }
    },
    {
      name: 'no-ui-to-flow-effect',
      comment: 'UI must not import flow-effect; it receives plain data + plain errors via props.',
      severity: 'error',
      from: { path: '^packages/flow/ui/src' },
      to: { path: '^packages/flow/effect/src' }
    },

    // ---- shared socle must never depend on a variant ---------------------------------------
    {
      name: 'no-shared-to-flow',
      comment: 'Shared socle packages must stay variant-agnostic.',
      severity: 'error',
      from: { path: '^packages/(contracts|fixtures|metrics|ui-spec|test-scenarios)/src' },
      to: { path: '^packages/flow/' }
    },

    // ---- no cross-variant dependencies (future Friction / Overfit) --------------------------
    {
      name: 'no-cross-variant',
      comment: 'Flow must not depend on Friction or Overfit (and vice versa).',
      severity: 'error',
      from: { path: '^(packages/flow|apps/flow-app)/' },
      to: { path: '^(packages|apps)/(friction|overfit)' }
    },

    // ---- no unauthorized circular dependencies ---------------------------------------------
    {
      name: 'no-circular',
      comment:
        'No circular dependencies (the generated TanStack route tree is excluded — see route-tree-cycle-note.md).',
      severity: 'error',
      from: {},
      to: { circular: true }
    }
  ],
  options: {
    tsConfig: { fileName: 'tsconfig.base.json' },
    tsPreCompilationDeps: true,
    doNotFollow: { path: 'node_modules' },
    // The generated route tree is excluded from cycle/boundary checks (it is regenerated and is a
    // known, by-design TanStack cycle with router.tsx).
    exclude: { path: 'routeTree\\.gen\\.ts$' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types']
    }
  }
}
