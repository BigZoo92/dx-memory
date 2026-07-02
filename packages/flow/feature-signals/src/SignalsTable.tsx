import { useRef } from 'react'
import { Link } from '@tanstack/react-router'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type RowSelectionState,
  type SortingState
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Signal, SignalStatus } from '@signalops/contracts'
import { formatDateTime } from '@signalops/flow-domain'
import {
  Button,
  Checkbox,
  ConfidenceDisplay,
  RiskScoreCell,
  SeverityBadge,
  StatusBadge
} from '@signalops/flow-ui'
import styles from './SignalsTable.module.css'

// Stable empty defaults (module-level) so unprovided overrides don't break referential equality.
const NO_STATUS_OVERRIDES: Record<string, SignalStatus> = {}
const NO_ASSIGNEE_OVERRIDES: Record<string, string> = {}

/**
 * Fixed row height (px). MUST stay in sync with `.row { height }` in SignalsTable.module.css:
 * TanStack Virtual positions rows in `estimateSize` increments, so any mismatch between this
 * value and the real CSS height makes rows overlap. One source of truth = no overlap, no drift.
 */
const SIGNALS_ROW_HEIGHT = 64

export type SignalsTableProps = {
  signals: Signal[]
  rowSelection: RowSelectionState
  onRowSelectionChange: OnChangeFn<RowSelectionState>
  sorting: SortingState
  onSortingChange: OnChangeFn<SortingState>
  /** Local optimistic overrides from bulk actions (see SignalsScreen). */
  statusOverrides?: Record<string, SignalStatus>
  assigneeOverrides?: Record<string, string>
}

function buildColumns(
  statusOverrides: Record<string, SignalStatus>,
  assigneeOverrides: Record<string, string>
): ColumnDef<Signal>[] {
  return [
    {
      id: 'select',
      enableSorting: false,
      header: ({ table }) => (
        <Checkbox
          ariaLabel="Select all signals"
          checked={table.getIsAllRowsSelected()}
          indeterminate={table.getIsSomeRowsSelected()}
          onChange={(value) => table.toggleAllRowsSelected(value)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          ariaLabel={`Select ${row.original.id}`}
          checked={row.getIsSelected()}
          onChange={(value) => row.toggleSelected(value)}
        />
      )
    },
    {
      id: 'title',
      header: 'Title',
      enableSorting: false,
      cell: ({ row }) => (
        <div className={styles.titleCell}>
          <span className={styles.title}>{row.original.title}</span>
          <span className={styles.id}>{row.original.id}</span>
        </div>
      )
    },
    {
      id: 'severity',
      header: 'Severity',
      accessorKey: 'severity',
      cell: ({ row }) => <SeverityBadge severity={row.original.severity} />
    },
    {
      id: 'status',
      header: 'Status',
      enableSorting: false,
      cell: ({ row }) => (
        <StatusBadge status={statusOverrides[row.original.id] ?? row.original.status} />
      )
    },
    {
      id: 'source',
      header: 'Source',
      enableSorting: false,
      cell: ({ row }) => <span style={{ textTransform: 'capitalize' }}>{row.original.source}</span>
    },
    {
      id: 'riskScore',
      header: 'Risk score',
      accessorKey: 'riskScore',
      cell: ({ row }) => <RiskScoreCell score={row.original.riskScore} />
    },
    {
      id: 'confidence',
      header: 'Confidence',
      accessorKey: 'confidence',
      cell: ({ row }) => <ConfidenceDisplay confidence={row.original.confidence} />
    },
    {
      id: 'assignedTo',
      header: 'Assigned to',
      enableSorting: false,
      cell: ({ row }) => {
        const assignee = assigneeOverrides[row.original.id] ?? row.original.assignedTo
        return assignee ? (
          <span className={styles.mono}>{assignee}</span>
        ) : (
          <span className={styles.muted}>Unassigned</span>
        )
      }
    },
    {
      id: 'createdAt',
      header: 'Created',
      accessorKey: 'createdAt',
      cell: ({ row }) => (
        <span className={styles.mono}>{formatDateTime(row.original.createdAt)}</span>
      )
    },
    {
      id: 'incident',
      header: 'Linked incident',
      enableSorting: false,
      cell: ({ row }) =>
        row.original.hasLinkedIncident ? (
          <Link to="/incidents" className={styles.mono}>
            linked
          </Link>
        ) : (
          <span className={styles.muted}>—</span>
        )
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <Link to="/signals/$id" params={{ id: row.original.id }}>
          <Button size="sm" variant="ghost">
            View
          </Button>
        </Link>
      )
    }
  ]
}

/**
 * Dense signals table. TanStack Table owns column/sort/selection state (sorting is manual —
 * the server sorts). TanStack Virtual renders only the visible rows so the table stays smooth
 * regardless of how many rows are loaded.
 */
export function SignalsTable({
  signals,
  rowSelection,
  onRowSelectionChange,
  sorting,
  onSortingChange,
  statusOverrides = NO_STATUS_OVERRIDES,
  assigneeOverrides = NO_ASSIGNEE_OVERRIDES
}: SignalsTableProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const columns = buildColumns(statusOverrides, assigneeOverrides)

  const table = useReactTable({
    data: signals,
    columns,
    state: { rowSelection, sorting },
    onRowSelectionChange,
    onSortingChange,
    manualSorting: true,
    enableRowSelection: true,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel()
  })

  const rows = table.getRowModel().rows
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => SIGNALS_ROW_HEIGHT,
    overscan: 12
  })

  return (
    // Single scroll container for BOTH axes: the sticky header + virtualized rows live inside it,
    // so there is exactly one horizontal and one vertical scrollbar (no nested double scrollbar).
    <div ref={parentRef} className={styles.viewport}>
      <div
        className={styles.grid}
        role="grid"
        aria-label="Signals"
        aria-rowcount={rows.length + 1}
        aria-colcount={columns.length}
      >
        <div className={styles.headerRow} role="row" aria-rowindex={1}>
          {table.getHeaderGroups()[0].headers.map((header, columnIndex) => {
            const canSort = header.column.getCanSort()
            const sorted = header.column.getIsSorted()
            const indicator = sorted === 'asc' ? ' ▲' : sorted === 'desc' ? ' ▼' : ''
            return (
              <div
                key={header.id}
                className={styles.headerCell}
                role="columnheader"
                aria-colindex={columnIndex + 1}
                aria-sort={
                  canSort
                    ? sorted === 'asc'
                      ? 'ascending'
                      : sorted === 'desc'
                        ? 'descending'
                        : 'none'
                    : undefined
                }
              >
                {canSort ? (
                  <button
                    type="button"
                    className={styles.sortBtn}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {indicator}
                  </button>
                ) : (
                  flexRender(header.column.columnDef.header, header.getContext())
                )}
              </div>
            )
          })}
        </div>

        <div className={styles.sizer} style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index]
            return (
              <div
                key={row.id}
                role="row"
                aria-rowindex={virtualRow.index + 2}
                aria-selected={row.getIsSelected()}
                className={`${styles.row} ${row.getIsSelected() ? styles.rowSelected : ''}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: SIGNALS_ROW_HEIGHT,
                  transform: `translateY(${virtualRow.start}px)`
                }}
              >
                {row.getVisibleCells().map((cell, cellIndex) => (
                  <div
                    key={cell.id}
                    role="gridcell"
                    aria-colindex={cellIndex + 1}
                    className={styles.cell}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
