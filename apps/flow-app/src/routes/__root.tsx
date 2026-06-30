import { useState, type ReactNode } from 'react'
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppLayout } from '../app/layout/AppLayout'
import '@signalops/flow-ui/styles.css'
import '../app/styles/app.css'

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
  component: RootDocument
})

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
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Providers>
          <AppLayout>
            <Outlet />
          </AppLayout>
        </Providers>
        <Scripts />
      </body>
    </html>
  )
}
