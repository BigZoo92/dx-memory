/**
 * @signalops/flow-feature-signals — the `/signals` Signals Explorer screen.
 *
 * Filter bar (search / severity / status / source / assignee / date range / reset), the
 * virtualized dense table (TanStack Table + Virtual, 10k+ rows), server-driven sort + pagination,
 * multi-select and bulk actions (Assign selected / Mark as triaged) with a visible local effect.
 * Search/sort/page state is owned by the app router and passed via `search` + `onSearchChange`.
 */
export { SignalsScreen, type SignalsScreenProps } from './SignalsScreen'
export { SignalsTable, type SignalsTableProps } from './SignalsTable'
export { toSignalsQuery, type SignalsSearch } from './query'
