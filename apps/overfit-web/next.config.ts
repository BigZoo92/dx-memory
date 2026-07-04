import path from 'node:path'
import type { NextConfig } from 'next'

// The Rust API base. In dev/prod the browser calls same-origin `/api/*`, which Next rewrites to the
// Axum backend. Override with OVERFIT_API_URL (the docker-compose service sets it to http://api:3200).
const API_URL = process.env.OVERFIT_API_URL ?? 'http://localhost:3200'
const configuredBasePath =
  process.env.OVERFIT_BASE_PATH ?? process.env.NEXT_PUBLIC_OVERFIT_BASE_PATH ?? ''
const basePath = configuredBasePath === '/' ? '' : configuredBasePath.replace(/\/+$/, '')

const nextConfig: NextConfig = {
  reactStrictMode: true,
  basePath,
  trailingSlash: true,
  turbopack: {
    root: path.resolve(__dirname, '../..')
  },
  // Emit a self-contained server bundle for the slim runtime Docker stage.
  output: 'standalone',
  // The over-decomposed feature/ui/client packages ship TypeScript source; Next transpiles them.
  transpilePackages: [
    '@signalops/overfit-api-client',
    '@signalops/overfit-contracts-generated',
    '@signalops/overfit-ui',
    '@signalops/overfit-feature-dashboard',
    '@signalops/overfit-feature-signals',
    '@signalops/overfit-feature-signal-detail',
    '@signalops/overfit-feature-incidents',
    '@signalops/overfit-feature-compare',
    '@signalops/overfit-feature-dx-metrics',
    '@signalops/overfit-feature-settings',
    '@signalops/overfit-feature-ops'
  ],
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_URL}/api/:path*` }]
  }
}

export default nextConfig
