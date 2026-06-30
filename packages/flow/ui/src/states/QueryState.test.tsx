import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryState, type QueryLike } from './QueryState'

function makeQuery<T>(partial: Partial<QueryLike<T>>): QueryLike<T> {
  return {
    isPending: false,
    isError: false,
    error: null,
    data: undefined,
    refetch: () => undefined,
    ...partial
  }
}

describe('QueryState', () => {
  it('renders a loading placeholder while pending', () => {
    render(
      <QueryState query={makeQuery({ isPending: true })}>{() => <div>content</div>}</QueryState>
    )
    expect(screen.getByLabelText('Loading')).toBeInTheDocument()
  })

  it('renders the data via children on success', () => {
    render(
      <QueryState query={makeQuery({ data: 'hello' })}>{(data) => <div>{data}</div>}</QueryState>
    )
    expect(screen.getByText('hello')).toBeInTheDocument()
  })

  it('surfaces the ApiError message + requestId on error (duck-typed)', () => {
    const error = { apiError: { message: 'Signal sig_x is missing', requestId: 'req_42' } }
    render(
      <QueryState query={makeQuery({ isError: true, error })} errorTitle="Lookup failed">
        {() => <div>content</div>}
      </QueryState>
    )
    expect(screen.getByText('Lookup failed')).toBeInTheDocument()
    expect(screen.getByText('Signal sig_x is missing')).toBeInTheDocument()
    expect(screen.getByText(/req_42/)).toBeInTheDocument()
  })
})
