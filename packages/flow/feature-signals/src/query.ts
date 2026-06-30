import type {
  SignalSeverity,
  SignalSource,
  SignalStatus,
  SignalsQuery,
  SortDirection
} from '@signalops/contracts'

/** URL-backed search/filter/sort/page state. The app owns the router; the screen gets it via props. */
export type SignalsSearch = {
  search?: string
  severity?: SignalSeverity
  status?: SignalStatus
  source?: SignalSource
  assignedTo?: string
  dateFrom?: string
  dateTo?: string
  sortBy?: SignalsQuery['sortBy']
  sortDirection?: SortDirection
  page?: number
}

/** Map the URL search into a full `SignalsQuery`, applying Flow's defaults (risk desc, page 1). */
export function toSignalsQuery(search: SignalsSearch, pageSize: number): SignalsQuery {
  return {
    ...search,
    page: search.page ?? 1,
    pageSize,
    sortBy: search.sortBy ?? 'riskScore',
    sortDirection: search.sortDirection ?? 'desc'
  }
}
