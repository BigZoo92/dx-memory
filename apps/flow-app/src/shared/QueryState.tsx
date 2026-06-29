import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { ErrorState, SkeletonRows } from '@signalops/flow-ui'
import { ApiRequestError } from './api/client'

export type QueryStateProps<T> = {
  query: UseQueryResult<T>
  children: (data: T) => ReactNode
  /** Custom loading placeholder; defaults to skeleton rows. */
  loading?: ReactNode
  errorTitle?: string
}

/**
 * Centralizes the loading / error states for a TanStack Query so every screen handles
 * slow-network and global-error consistently (and surfaces the ApiError requestId on failure).
 */
export function QueryState<T>({ query, children, loading, errorTitle }: QueryStateProps<T>) {
  if (query.isPending) return <>{loading ?? <SkeletonRows rows={6} />}</>
  if (query.isError) {
    const requestId =
      query.error instanceof ApiRequestError ? query.error.apiError.requestId : undefined
    const message =
      query.error instanceof ApiRequestError
        ? query.error.apiError.message
        : 'This screen could not be loaded.'
    return (
      <ErrorState
        title={errorTitle}
        message={message}
        requestId={requestId}
        onRetry={() => query.refetch()}
      />
    )
  }
  return <>{children(query.data)}</>
}
