/**
 * Overfit (Variant C) boundary rules — deliberately stricter than the Flow config, and kept in a
 * separate file so it never affects Flow or Friction.
 *
 *   pnpm overfit:contracts:check  ← not this; run with:
 *   depcruise --config .dependency-cruiser.overfit.cjs packages/overfit apps/overfit-web/app
 *
 * The rules encode the over-decomposed layering: features are islands, the api-client is the only
 * HTTP boundary, the UI is presentation-only, and nothing in Overfit may import Flow/Friction.
 */
module.exports = {
  forbidden: [
    {
      name: 'no-flow-or-friction-from-overfit',
      comment: 'Overfit must never depend on another variant.',
      severity: 'error',
      from: { path: '^(packages/overfit|apps/overfit-web)' },
      to: { path: '(packages/flow|apps/flow-app|apps/friction)' }
    },
    {
      name: 'features-are-islands',
      comment: 'A feature package must not import another feature package.',
      severity: 'error',
      from: { path: '^packages/overfit/feature-([^/]+)/' },
      to: { path: '^packages/overfit/feature-(?!$1)([^/]+)/' }
    },
    {
      name: 'ui-is-presentation-only',
      comment: 'The UI package must not reach the api-client or any feature.',
      severity: 'error',
      from: { path: '^packages/overfit/ui/' },
      to: { path: '^packages/overfit/(api-client|feature-)' }
    },
    {
      name: 'api-client-only-contracts',
      comment: 'The api-client may only depend on the generated contracts.',
      severity: 'error',
      from: { path: '^packages/overfit/api-client/' },
      to: {
        path: '^packages/overfit/',
        pathNot: '^packages/overfit/(api-client|contracts-generated)/'
      }
    },
    {
      name: 'no-circular',
      comment: 'No cycles anywhere in Overfit.',
      severity: 'error',
      from: {},
      to: { circular: true }
    }
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.base.json' },
    tsPreCompilationDeps: true,
    exclude: { path: '\\.(test|spec)\\.(ts|tsx)$' }
  }
}
