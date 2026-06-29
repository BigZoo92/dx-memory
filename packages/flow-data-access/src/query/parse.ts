import { z } from 'zod'
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  SIGNAL_SEVERITIES,
  SIGNAL_SORT_FIELDS,
  SIGNAL_SOURCES,
  SIGNAL_STATUSES,
  INCIDENT_IMPACTS,
  INCIDENT_STATUSES,
  type IncidentsQuery,
  type SignalsQuery
} from '@signalops/contracts'
import { badRequest } from '../api-errors/api-error'

/** Raw query input — what a server route gets from `URLSearchParams` (strings only). */
export type RawQuery = Record<string, string | null | undefined> | URLSearchParams

function toRecord(input: RawQuery): Record<string, string> {
  const entries = input instanceof URLSearchParams ? [...input.entries()] : Object.entries(input)
  const out: Record<string, string> = {}
  for (const [key, value] of entries) {
    // Treat absent and empty ("All" selections) as "no filter".
    if (value !== null && value !== undefined && value !== '') out[key] = value
  }
  return out
}

const SignalsQuerySchema = z.object({
  search: z.string().trim().optional(),
  severity: z.enum(SIGNAL_SEVERITIES).optional(),
  status: z.enum(SIGNAL_STATUSES).optional(),
  source: z.enum(SIGNAL_SOURCES).optional(),
  assignedTo: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
  sortBy: z.enum(SIGNAL_SORT_FIELDS).optional(),
  sortDirection: z.enum(['asc', 'desc']).optional()
})

const IncidentsQuerySchema = z.object({
  status: z.enum(INCIDENT_STATUSES).optional(),
  severity: z.enum(SIGNAL_SEVERITIES).optional(),
  impact: z.enum(INCIDENT_IMPACTS).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional()
})

/** Parse + validate `/api/signals` query params. Invalid values raise a typed 400 `ApiError`. */
export function parseSignalsQuery(input: RawQuery): SignalsQuery {
  const result = SignalsQuerySchema.safeParse(toRecord(input))
  if (!result.success) {
    throw badRequest('Invalid signals query parameters', result.error.flatten())
  }
  return result.data
}

/** Parse + validate `/api/incidents` query params. */
export function parseIncidentsQuery(input: RawQuery): IncidentsQuery {
  const result = IncidentsQuerySchema.safeParse(toRecord(input))
  if (!result.success) {
    throw badRequest('Invalid incidents query parameters', result.error.flatten())
  }
  return result.data
}

export { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE }
