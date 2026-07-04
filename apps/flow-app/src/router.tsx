import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

const configuredBasePath =
  import.meta.env.VITE_BASE_PATH ?? import.meta.env.VITE_APP_BASE_PATH ?? '/'
const basepath = configuredBasePath === '/' ? '/' : configuredBasePath.replace(/\/+$/, '')

/** Create the app router. TanStack Start calls `getRouter()` on both server and client. */
export function getRouter() {
  return createTanStackRouter({
    routeTree,
    basepath,
    defaultPreload: 'intent',
    scrollRestoration: true
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
