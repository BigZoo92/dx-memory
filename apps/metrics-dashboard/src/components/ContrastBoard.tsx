import { variants } from '../data'
import type { VariantId, Direction } from '../types'
import { VARIANT_COLOR, VARIANT_LABEL } from '../lib/theme'
import { metricText } from '../lib/format'
import { Reveal } from './ui'

/**
 * The thesis in two columns. Left: single-metric trophies — real raw values where a
 * variant genuinely wins a local scoreboard. Right: the delivery-cost readings that
 * decide the verdict. Winners are COMPUTED from the collected values (direction-aware),
 * never named in code: rename a variant and the board doesn't change.
 */

type RowSpec = { key: string; label: string; dir?: Direction; note?: string }

const LOCAL: RowSpec[] = [
  { key: 'variant.ci.validation.cold', label: 'Cold full validation', note: 'build + typecheck + lint + test, caches off' },
  { key: 'bundleJsGzipKb', label: 'JS shipped to the browser', note: 'gzip, real build output' },
  { key: 'businessRatio', label: 'Least boilerplate', dir: 'higher', note: 'share of code that is product logic' },
  { key: 'avgComplexity', label: 'Cleanest functions', note: 'avg cyclomatic complexity' },
  { key: 'maxComplexity', label: 'Worst-function ceiling', note: 'highest cyclomatic complexity anywhere' },
  { key: 'anyCount', label: 'Strictest typing', note: '`any` escape hatches' }
]

const COST: RowSpec[] = [
  { key: 'variant.ci.validation.warm', label: 'Re-validate a change', note: 'same gates, real caches — paid all day long' },
  { key: 'change.contract.restatements', label: 'Contract copies to sync', note: 'hand-written re-declarations of the data shape' },
  { key: 'ship.services.count', label: 'Services per release', note: 'images to build, push, deploy' },
  { key: 'run.inspection.surfaces', label: 'Runtimes to debug', note: 'where to look when prod misbehaves' }
]

function winnerOf(key: string, dir?: Direction): VariantId | null {
  const scored = variants
    .map((v) => ({ id: v.meta.variant as VariantId, m: v.metrics[key] }))
    .filter((d) => d.m?.status === 'ok' && typeof d.m.value === 'number')
  if (scored.length < 2) return null
  const direction = dir ?? scored[0].m!.direction
  scored.sort((a, b) =>
    direction === 'higher' ? (b.m!.value as number) - (a.m!.value as number) : (a.m!.value as number) - (b.m!.value as number)
  )
  // an exact tie has no trophy
  if (scored[1] && scored[0].m!.value === scored[1].m!.value) return null
  return scored[0].id
}

function Board({ title, sub, rows, tone }: { title: string; sub: string; rows: RowSpec[]; tone: 'local' | 'cost' }) {
  return (
    <Reveal className={`card contrast-board ${tone}`}>
      <div className="contrast-head">
        <span className="contrast-title">{title}</span>
        <span className="tiny muted">{sub}</span>
      </div>
      {rows.map((r) => {
        const win = winnerOf(r.key, r.dir)
        return (
          <div className="contrast-row" key={r.key}>
            <div className="contrast-label">
              <span>{r.label}</span>
              {r.note && <span className="tiny muted">{r.note}</span>}
            </div>
            <div className="contrast-values">
              {variants.map((v) => {
                const id = v.meta.variant as VariantId
                const m = v.metrics[r.key]
                const isWin = win === id
                const c = VARIANT_COLOR[id]
                return (
                  <span
                    key={id}
                    className={`contrast-val mono ${isWin ? 'win' : ''}`}
                    style={isWin ? { color: c.glow, borderColor: c.mark } : undefined}
                    title={`${VARIANT_LABEL[id]}: ${metricText(m)}`}
                  >
                    <i style={{ background: c.mark }} />
                    {metricText(m)}
                  </span>
                )
              })}
            </div>
          </div>
        )
      })}
    </Reveal>
  )
}

export function ContrastBoard() {
  return (
    <>
      <div className="grid cols-2 contrast-grid">
        <Board title="Local scoreboards" sub="one metric at a time — the trap" rows={LOCAL} tone="local" />
        <Board title="Delivery cost" sub="what a change actually costs — the verdict" rows={COST} tone="cost" />
      </div>
      <p className="contrast-conclusion">
        The first validation happens once. <b>Feedback — and change — happen all day.</b>
      </p>
    </>
  )
}
