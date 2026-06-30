import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import {
  SIGNAL_SEVERITIES,
  SIGNAL_SORT_FIELDS,
  SIGNAL_SOURCES,
  SIGNAL_STATUSES
} from '@signalops/contracts'
import { SignalsScreen, type SignalsSearch } from '@signalops/flow-feature-signals'

// URL is the source of truth for filters/sort/page → shareable, back-button friendly.
const searchSchema = z.object({
  search: z.string().optional(),
  severity: z.enum(SIGNAL_SEVERITIES).optional(),
  status: z.enum(SIGNAL_STATUSES).optional(),
  source: z.enum(SIGNAL_SOURCES).optional(),
  assignedTo: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.enum(SIGNAL_SORT_FIELDS).optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
  page: z.number().int().min(1).optional()
})

export const Route = createFileRoute('/signals/')({
  validateSearch: searchSchema,
  component: SignalsRoute
})

/** The app owns the router; the feature gets URL state + an update callback via props. */
function SignalsRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const onSearchChange = (next: SignalsSearch) => navigate({ search: next })
  return <SignalsScreen search={search} onSearchChange={onSearchChange} />
}
