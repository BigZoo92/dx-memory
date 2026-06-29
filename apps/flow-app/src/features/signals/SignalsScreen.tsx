import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import type { OnChangeFn, RowSelectionState, SortingState } from '@tanstack/react-table'
import {
  SIGNAL_SEVERITIES,
  SIGNAL_SOURCES,
  SIGNAL_STATUSES,
  type SignalsQuery,
  type SortDirection
} from '@signalops/contracts'
import { UNASSIGNED, averageRiskScore } from '@signalops/flow-domain'
import {
  Banner,
  BulkActionBar,
  Button,
  Card,
  DataTableShell,
  EmptyState,
  ErrorState,
  FilterSelect,
  PageHeader,
  SearchInput,
  SkeletonRows,
  type SelectOption
} from '@signalops/flow-ui'
import { useSignals } from '../../shared/api/queries'
import { ApiRequestError } from '../../shared/api/client'
import { SignalsTable } from './SignalsTable'
import styles from './SignalsScreen.module.css'

const routeApi = getRouteApi('/signals/')
const PAGE_SIZE = 100

const opt = (values: readonly string[], label: (v: string) => string): SelectOption[] => [
  { value: '', label: 'All' },
  ...values.map((v) => ({ value: v, label: label(v) }))
]
const cap = (v: string) => v.charAt(0).toUpperCase() + v.slice(1)

const SEVERITY_OPTIONS = opt(SIGNAL_SEVERITIES, cap)
const STATUS_OPTIONS = opt(SIGNAL_STATUSES, cap)
const SOURCE_OPTIONS = opt(SIGNAL_SOURCES, (v) => (v === 'api' ? 'API' : cap(v)))
const ASSIGNED_OPTIONS: SelectOption[] = [
  { value: '', label: 'All' },
  { value: UNASSIGNED, label: 'Unassigned' }
]

export function SignalsScreen() {
  const search = routeApi.useSearch()
  const navigate = routeApi.useNavigate()
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [actionBanner, setActionBanner] = useState<string | null>(null)

  const query: SignalsQuery = {
    ...search,
    page: search.page ?? 1,
    pageSize: PAGE_SIZE,
    sortBy: search.sortBy ?? 'riskScore',
    sortDirection: search.sortDirection ?? 'desc'
  }
  const result = useSignals(query)

  const setFilter = (key: keyof SignalsQuery, value: string) => {
    navigate({ search: (prev) => ({ ...prev, [key]: value || undefined, page: 1 }) })
    setRowSelection({})
  }

  const sorting: SortingState = [
    { id: query.sortBy ?? 'riskScore', desc: (query.sortDirection ?? 'desc') === 'desc' }
  ]
  const onSortingChange: OnChangeFn<SortingState> = (updater) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater
    const first = next[0]
    if (first) {
      navigate({
        search: (prev) => ({
          ...prev,
          sortBy: first.id as SignalsQuery['sortBy'],
          sortDirection: (first.desc ? 'desc' : 'asc') as SortDirection,
          page: 1
        })
      })
    }
  }

  const resetFilters = () => {
    navigate({ search: {} })
    setRowSelection({})
  }

  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id])
  const items = result.data?.items ?? []
  const selectedRisk = items.filter((s) => rowSelection[s.id]).map((s) => s.riskScore)

  const total = result.data?.total ?? 0
  const page = result.data?.page ?? 1
  const totalPages = result.data?.totalPages ?? 1

  const goPage = (next: number) => {
    navigate({ search: (prev) => ({ ...prev, page: next }) })
    setRowSelection({})
  }

  const bulk = (verb: string) => {
    setActionBanner(
      `${verb} ${selectedIds.length} signal${selectedIds.length === 1 ? '' : 's'} (demo action).`
    )
    setRowSelection({})
  }

  return (
    <div className="so-page">
      <PageHeader
        title="Signals Explorer"
        subtitle={`${items.length} of ${total.toLocaleString()} signals · sorted by ${query.sortBy}`}
      />

      <Card>
        <div className={styles.filters}>
          <SearchInput
            label="Search"
            value={search.search ?? ''}
            onChange={(v) => setFilter('search', v)}
            placeholder="Title, ID, source, assignee…"
          />
          <FilterSelect
            label="Severity"
            value={search.severity ?? ''}
            options={SEVERITY_OPTIONS}
            onChange={(v) => setFilter('severity', v)}
          />
          <FilterSelect
            label="Status"
            value={search.status ?? ''}
            options={STATUS_OPTIONS}
            onChange={(v) => setFilter('status', v)}
          />
          <FilterSelect
            label="Source"
            value={search.source ?? ''}
            options={SOURCE_OPTIONS}
            onChange={(v) => setFilter('source', v)}
          />
          <FilterSelect
            label="Assigned to"
            value={search.assignedTo ?? ''}
            options={ASSIGNED_OPTIONS}
            onChange={(v) => setFilter('assignedTo', v)}
          />
          <div className={styles.resetWrap}>
            <Button variant="secondary" onClick={resetFilters}>
              Reset filters
            </Button>
          </div>
        </div>
        <div className={styles.dateField} style={{ marginTop: 12 }}>
          <span className={styles.dateLabel}>Date range</span>
          <div className={styles.dateInputs}>
            <input
              className={styles.dateInput}
              type="date"
              aria-label="From date"
              value={(search.dateFrom ?? '').slice(0, 10)}
              onChange={(e) =>
                setFilter('dateFrom', e.target.value ? `${e.target.value}T00:00:00.000Z` : '')
              }
            />
            <input
              className={styles.dateInput}
              type="date"
              aria-label="To date"
              value={(search.dateTo ?? '').slice(0, 10)}
              onChange={(e) =>
                setFilter('dateTo', e.target.value ? `${e.target.value}T23:59:59.999Z` : '')
              }
            />
          </div>
        </div>
      </Card>

      {actionBanner ? (
        <Banner tone="success" onRetry={() => setActionBanner(null)} retryLabel="Dismiss">
          {actionBanner}
        </Banner>
      ) : null}

      <DataTableShell
        toolbar={
          selectedIds.length > 0 ? (
            <BulkActionBar
              count={selectedIds.length}
              avgRisk={averageRiskScore(selectedRisk)}
              onAssign={() => bulk('Assigned')}
              onTriage={() => bulk('Marked as triaged')}
              onClear={() => setRowSelection({})}
            />
          ) : (
            <div className={styles.toolbar}>
              <span>
                <span className={styles.count}>{total.toLocaleString()}</span> results · ready for
                10,000+ rows
              </span>
            </div>
          )
        }
      >
        {result.isPending ? (
          <div style={{ padding: 16 }}>
            <SkeletonRows rows={10} />
          </div>
        ) : result.isError ? (
          <ErrorState
            message={
              result.error instanceof ApiRequestError
                ? result.error.apiError.message
                : 'Could not load signals.'
            }
            requestId={
              result.error instanceof ApiRequestError ? result.error.apiError.requestId : undefined
            }
            onRetry={() => result.refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState
            action={
              <Button variant="secondary" onClick={resetFilters}>
                Reset filters
              </Button>
            }
          />
        ) : (
          <>
            <SignalsTable
              signals={items}
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
              sorting={sorting}
              onSortingChange={onSortingChange}
            />
            <div className={styles.pagination}>
              <span>
                Page {page} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => goPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => goPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </>
        )}
      </DataTableShell>
    </div>
  )
}
