import { useEffect, useState, type ReactNode } from 'react'
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ErrorState, FlowErrorBoundary, SkipLink } from '@signalops/flow-ui'
import { createLogger, getDefaultStore } from '@signalops/flow-observability'
import { AppLayout } from '../app/layout/AppLayout'
import { installClientObservability } from '../app/observability-client'
import '@signalops/flow-ui/styles.css'
import '../app/styles/app.css'

// One client-side logger into the shared in-memory store the Ops surface reads.
const rootLogger = createLogger({ store: getDefaultStore(), runtime: 'client' })

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'SignalOps — Variant B (Flow)' },
      {
        name: 'description',
        content: 'SignalOps — monitor, qualify and prioritize operational signals.'
      }
    ]
  }),
  component: RootDocument,
  errorComponent: RootErrorComponent,
  notFoundComponent: RootNotFound
})

function RootErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    rootLogger.error(error instanceof Error ? error.message : String(error), {
      errorTag: 'route-error',
      errorCode: 'route_error'
    })
  }, [error])
  return (
    <ErrorState
      title="This screen hit an error"
      message={error instanceof Error ? error.message : 'Unexpected error'}
      onRetry={reset}
    />
  )
}

function RootNotFound() {
  return <ErrorState title="Page not found" message="This route does not exist." />
}

function Providers({ children }: { children: ReactNode }) {
  // One QueryClient per render tree (per request on the server, once on the client).
  // Retry is OFF here on purpose: the api-client (Effect) owns transient-network retry with a
  // bounded backoff, so TanStack Query stays responsible only for caching/server-state — no
  // double-retry, and deterministic API errors surface immediately.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false, staleTime: 15_000 }
        }
      })
  )
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

function RootDocument() {
  useEffect(() => {
    installClientObservability()
  }, [])

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <SkipLink />
        <Providers>
          <AppLayout>
            <FlowErrorBoundary
              onError={(error) =>
                rootLogger.error(error.message, {
                  errorTag: 'render-error',
                  errorCode: 'render_error'
                })
              }
            >
              <Outlet />
            </FlowErrorBoundary>
          </AppLayout>
        </Providers>
        <Scripts />
      </body>
    </html>
  )
}
