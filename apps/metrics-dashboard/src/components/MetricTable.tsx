import { useMemo, useState } from 'react'
import { summary, variants, VARIANT_ORDER } from '../data'
import type { VariantId } from '../types'
import { VARIANT_COLOR, VARIANT_LABEL } from '../lib/theme'
import { metricText, directionArrow, directionLabel } from '../lib/format'

type SortKey = 'metric' | 'category' | VariantId

/**
 * Full catalog table — every collected metric, per variant, sortable and filterable, with
 * winners marked and a compare mode (pick variants; a 2-variant selection shows the delta).
 */
export function MetricTable() {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string>('all')
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'category', dir: 1 })
  const [selected, setSelected] = useState<VariantId[]>([...VARIANT_ORDER])

  // Repo-level metrics (shared GitHub pipeline) tie across variants — they belong in the
  // GitHub / History / PR sections, not this per-variant comparison table.
  const perVariantKeys = useMemo(
    () => Object.keys(summary.catalog).filter((k) => summary.catalog[k].scope !== 'repo'),
    []
  )

  const categories = useMemo(() => {
    const s = new Set<string>()
    perVariantKeys.forEach((k) => s.add(summary.catalog[k].category))
    return ['all', ...Array.from(s).sort()]
  }, [perVariantKeys])

  const rows = useMemo(() => {
    let keys = perVariantKeys.slice()
    if (cat !== 'all') keys = keys.filter((k) => summary.catalog[k].category === cat)
    if (query.trim()) {
      const q = query.toLowerCase()
      keys = keys.filter(
        (k) => summary.catalog[k].label.toLowerCase().includes(q) || k.toLowerCase().includes(q)
      )
    }
    const val = (k: string, id: VariantId): number => {
      const ns = summary.normScores[k]?.[id]
      return ns == null ? -1 : ns
    }
    keys.sort((a, b) => {
      let d = 0
      if (sort.key === 'metric') d = summary.catalog[a].label.localeCompare(summary.catalog[b].label)
      else if (sort.key === 'category')
        d =
          summary.catalog[a].category.localeCompare(summary.catalog[b].category) ||
          summary.catalog[a].label.localeCompare(summary.catalog[b].label)
      else d = val(a, sort.key) - val(b, sort.key)
      return d * sort.dir
    })
    return keys
  }, [query, cat, sort, perVariantKeys])

  const toggle = (id: VariantId) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...VARIANT_ORDER].filter((v) => s.includes(v) || v === id)))
  const shown = VARIANT_ORDER.filter((id) => selected.includes(id))
  const clickSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === 'metric' || key === 'category' ? 1 : -1 }))

  const showDelta = shown.length === 2

  return (
    <div>
      <div className="controls">
        <input
          className="input"
          placeholder="Search metrics…"
          aria-label="Search metrics"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="seg">
          {categories.map((c) => (
            <button key={c} className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>
        <div className="row" style={{ marginLeft: 'auto', gap: 8 }}>
          <span className="tiny muted">compare:</span>
          {variants.map((v) => {
            const id = v.meta.variant as VariantId
            const on = selected.includes(id)
            return (
              <span
                key={id}
                className={`chip toggle-chip ${on ? '' : 'off'}`}
                onClick={() => toggle(id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    toggle(id)
                  }
                }}
                role="button"
                tabIndex={0}
                aria-pressed={on}
                aria-label={`Toggle ${VARIANT_LABEL[id]} in comparison`}
              >
                <span className="chip-dot" style={{ background: VARIANT_COLOR[id].mark }} />
                {VARIANT_LABEL[id]}
              </span>
            )
          })}
        </div>
      </div>

      <div className="table-wrap">
        <table className="metrics">
          <thead>
            <tr>
              <th onClick={() => clickSort('metric')}>Metric {sortMark(sort, 'metric')}</th>
              <th onClick={() => clickSort('category')} style={{ textAlign: 'left' }}>
                Axis {sortMark(sort, 'category')}
              </th>
              {shown.map((id) => (
                <th key={id} onClick={() => clickSort(id)} style={{ color: VARIANT_COLOR[id].glow }}>
                  {VARIANT_LABEL[id]} {sortMark(sort, id)}
                </th>
              ))}
              {showDelta && <th>Δ {VARIANT_LABEL[shown[0]]}→{VARIANT_LABEL[shown[1]]}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((k) => {
              const c = summary.catalog[k]
              const winner = summary.winners[k]
              const a = variants.find((v) => v.meta.variant === shown[0])?.metrics[k]
              const b = shown[1] ? variants.find((v) => v.meta.variant === shown[1])?.metrics[k] : undefined
              const delta =
                showDelta && a?.status === 'ok' && b?.status === 'ok' && typeof a.value === 'number' && typeof b.value === 'number'
                  ? (b.value as number) - (a.value as number)
                  : null
              return (
                <tr key={k}>
                  <td>
                    <div className="metric-name">
                      <span className="n">
                        {c.label}
                        <span
                          className="scope-tag"
                          title={
                            c.scope === 'repo'
                              ? 'Repo-level: shared monorepo pipeline (ties across variants)'
                              : 'Variant-level: measured per app (compares the three)'
                          }
                        >
                          {c.scope === 'repo' ? 'repo' : 'variant'}
                        </span>
                      </span>
                      <span className="m" title={directionLabel(c.direction)}>
                        {directionArrow(c.direction)} {c.unit} · {directionLabel(c.direction)}
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'left' }}>
                    <span className="tiny muted">{c.category}</span>
                  </td>
                  {shown.map((id) => {
                    const m = variants.find((v) => v.meta.variant === id)?.metrics[k]
                    const best = winner === id && m?.status === 'ok'
                    return (
                      <td key={id} className={`cell-val ${best ? 'cell-best' : ''}`}>
                        {m?.status === 'ok' ? metricText(m) : <span className="pending">{m?.status === 'error' ? 'error' : 'pending'}</span>}
                        {best && <span className="win-badge" />}
                      </td>
                    )
                  })}
                  {showDelta && (
                    <td className="cell-val muted">{delta == null ? '—' : `${delta > 0 ? '+' : ''}${Math.round(delta * 100) / 100}`}</td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="chart-note">
        {rows.length} metrics shown · green = best of the compared variants · “pending” = not measured in this pass (never a
        faked value). Click a column header to sort.
      </p>
    </div>
  )
}

function sortMark(sort: { key: SortKey; dir: 1 | -1 }, key: SortKey) {
  if (sort.key !== key) return ''
  return sort.dir === 1 ? '▲' : '▼'
}
