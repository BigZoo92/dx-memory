import type { ReactNode } from 'react'
import { ErrorState } from './ErrorState'
import { SkeletonRows } from './Loading'

/**
 * Minimal structural shape of a TanStack Query result. Declared here (instead of importing
 * `UseQueryResult`) so `@signalops/flow-ui` stays free of a TanStack Query dependency — the UI
 * layer must not know how data is fetched. A real `useQuery(...)` result satisfies this.
 */
export type QueryLike<T> = {
  isPending: boolean
  isError: boolean
  error: unknown
  data: T | undefined
  refetch: () => unknown
}

/**
 * Duck-type the `ApiRequestError` envelope (from `@signalops/flow-api-client`) without importing
 * it — keeps the UI→api-client boundary closed while still surfacing the message + requestId.
 */
function extractApiError(error: unknown): { message: string; requestId?: string } | undefined {
  if (error && typeof error === 'object' && 'apiError' in error) {
    const envelope = (error as { apiError?: { message?: unknown; requestId?: unknown } }).apiError
    if (envelope && typeof envelope === 'object') {
      return {
        message: typeof envelope.message === 'string' ? envelope.message : 'Request failed',
        requestId: typeof envelope.requestId === 'string' ? envelope.requestId : undefined
      }
    }
  }
  return undefined
}

export type QueryStateProps<T> = {
  query: QueryLike<T>
  children: (data: T) => ReactNode
  /** Custom loading placeholder; defaults to skeleton rows. */
  loading?: ReactNode
  errorTitle?: string
}

/**
 * Centralizes loading / global-error handling for a query so every screen renders slow-network
 * and error states consistently (and surfaces the `ApiError` requestId on failure).
 */
export function QueryState<T>({ query, children, loading, errorTitle }: QueryStateProps<T>) {
  if (query.isPending) return <>{loading ?? <SkeletonRows rows={6} />}</>
  if (query.isError) {
    const api = extractApiError(query.error)
    return (
      <ErrorState
        title={errorTitle}
        message={api?.message ?? 'This screen could not be loaded.'}
        requestId={api?.requestId}
        onRetry={() => query.refetch()}
      />
    )
  }
  return <>{children(query.data as T)}</>
}
