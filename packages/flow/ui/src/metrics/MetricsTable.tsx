import styles from './MetricsTable.module.css'

export type MetricsTableHeader = { label: string; tag: string; current: boolean }
export type MetricsTableCell = { value: string; best: boolean; current: boolean }
export type MetricsTableRow = { metric: string; cells: MetricsTableCell[]; bestLabel: string }

export type MetricsTableProps = {
  headers: MetricsTableHeader[]
  rows: MetricsTableRow[]
}

/**
 * Full metrics table: rows = metrics, columns = Variant A / B / C / Best. The current variant
 * column is tinted, the best cell is green/bold, and the Best column names the winner. The app
 * builds the model (using @signalops/flow-domain); this component just renders it.
 */
export function MetricsTable({ headers, rows }: MetricsTableProps) {
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={`${styles.th} ${styles.thMetric}`}>Metric</th>
            {headers.map((header) => (
              <th
                key={header.label}
                className={`${styles.th} ${header.current ? styles.thCurrent : ''}`}
              >
                {header.label}
                <span className={styles.tag}>{header.tag}</span>
              </th>
            ))}
            <th className={`${styles.th} ${styles.thMetric}`}>Best</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.metric}>
              <td className={styles.metricName}>{row.metric}</td>
              {row.cells.map((cell, i) => (
                <td
                  key={i}
                  className={`${styles.cell} ${cell.current ? styles.cellCurrent : ''} ${cell.best ? styles.cellBest : ''}`}
                >
                  {cell.value}
                </td>
              ))}
              <td className={`${styles.cell} ${styles.bestCol}`}>{row.bestLabel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
