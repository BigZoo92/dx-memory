import { Effect, ParseResult, Schema } from 'effect'
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  SIGNAL_SEVERITIES,
  SIGNAL_SORT_FIELDS,
  SIGNAL_SOURCES,
  SIGNAL_STATUSES,
  INCIDENT_IMPACTS,
  INCIDENT_STATUSES,
  RISK_TRENDS,
  type IncidentsQuery
} from '@signalops/contracts'
import type { FlowSignalsQuery } from '@signalops/flow-domain'
import { FlowValidationError } from '@signalops/flow-effect'
import { RequestContext } from '../effect/request-context'

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

// Coerce a positive-integer page param from its string form (URLSearchParams are strings only).
const PageNumber = Schema.NumberFromString.pipe(Schema.int(), Schema.greaterThanOrEqualTo(1))
const PageSizeNumber = Schema.NumberFromString.pipe(Schema.int(), Schema.between(1, MAX_PAGE_SIZE))

// Effect Schema is the runtime source of truth for the API query frontier: one declaration yields
// the validator AND the decoded type, and a decode failure carries structured, formattable issues.
const SignalsQuerySchema = Schema.Struct({
  search: Schema.optional(Schema.String),
  severity: Schema.optional(Schema.Literal(...SIGNAL_SEVERITIES)),
  status: Schema.optional(Schema.Literal(...SIGNAL_STATUSES)),
  source: Schema.optional(Schema.Literal(...SIGNAL_SOURCES)),
  riskTrend: Schema.optional(Schema.Literal(...RISK_TRENDS)),
  assignedTo: Schema.optional(Schema.String),
  dateFrom: Schema.optional(Schema.String),
  dateTo: Schema.optional(Schema.String),
  page: Schema.optional(PageNumber),
  pageSize: Schema.optional(PageSizeNumber),
  sortBy: Schema.optional(Schema.Literal(...SIGNAL_SORT_FIELDS)),
  sortDirection: Schema.optional(Schema.Literal('asc', 'desc'))
})

const IncidentsQuerySchema = Schema.Struct({
  status: Schema.optional(Schema.Literal(...INCIDENT_STATUSES)),
  severity: Schema.optional(Schema.Literal(...SIGNAL_SEVERITIES)),
  impact: Schema.optional(Schema.Literal(...INCIDENT_IMPACTS)),
  page: Schema.optional(PageNumber),
  pageSize: Schema.optional(PageSizeNumber)
})

/** Decode a query record against a schema, mapping any `ParseError` to a typed validation error
 *  that carries the request id and the full list of issues as `details`. */
function decodeQuery<A, I>(
  schema: Schema.Schema<A, I>,
  input: RawQuery,
  message: string
): Effect.Effect<A, FlowValidationError, RequestContext> {
  return Effect.gen(function* () {
    const { requestId } = yield* RequestContext
    return yield* Schema.decodeUnknown(schema)(toRecord(input), { errors: 'all' }).pipe(
      Effect.mapError(
        (error) =>
          new FlowValidationError({
            requestId,
            message,
            details: ParseResult.ArrayFormatter.formatErrorSync(error)
          })
      )
    )
  })
}

/** Parse + validate `/api/signals` query params. Invalid values fail with `FlowValidationError`. */
export function parseSignalsQuery(
  input: RawQuery
): Effect.Effect<FlowSignalsQuery, FlowValidationError, RequestContext> {
  return decodeQuery(SignalsQuerySchema, input, 'Invalid signals query parameters')
}

/** Parse + validate `/api/incidents` query params. */
export function parseIncidentsQuery(
  input: RawQuery
): Effect.Effect<IncidentsQuery, FlowValidationError, RequestContext> {
  return decodeQuery(IncidentsQuerySchema, input, 'Invalid incidents query parameters')
}

export { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE }
