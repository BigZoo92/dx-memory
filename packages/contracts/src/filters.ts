import type { SignalSeverity, SignalSource, SignalStatus } from './signal'
import type { IncidentImpact, IncidentSeverity, IncidentStatus } from './incident'

export type SortDirection = 'asc' | 'desc'

export type SignalSortField = 'createdAt' | 'riskScore' | 'confidence' | 'severity'

/**
 * Query for `GET /api/signals`. Every field is optional; the API applies sensible
 * defaults (see `docs/product/00-product-contract.md`).
 */
export type SignalsQuery = {
  search?: string
  severity?: SignalSeverity
  status?: SignalStatus
  source?: SignalSource
  assignedTo?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
  sortBy?: SignalSortField
  sortDirection?: SortDirection
}

/** Query for `GET /api/incidents`. */
export type IncidentsQuery = {
  status?: IncidentStatus
  severity?: IncidentSeverity
  impact?: IncidentImpact
  page?: number
  pageSize?: number
}

export const DEFAULT_PAGE_SIZE = 50
export const MAX_PAGE_SIZE = 200
export const SIGNAL_SORT_FIELDS = ['createdAt', 'riskScore', 'confidence', 'severity'] as const
