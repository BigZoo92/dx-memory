import { variants } from '../data'
import type { VariantId } from '../types'
import { VARIANT_COLOR, VARIANT_LABEL } from '../lib/theme'
import { Reveal } from './ui'

/**
 * Moment 3 — observation first, explanation second.
 *
 * ONE CAPABILITY, THREE FOOTPRINTS: where the same product capability (risk trend,
 * one spec for all three variants) lives in each codebase — real file counts from
 * the change-experiment collector. A footprint, deliberately NOT presented as a
 * git diff: Overfit's implementation has no isolable baseline commit, so the same
 * deterministic footprint method is applied to all three instead of inventing one.
 *
 * WHY IT SPREADS: the structural explanation — how many hand-written copies of the
 * shared contract each variant maintains (real file paths from the collector).
 */

const SOURCE_OF_TRUTH = 'packages/contracts/src/signal.ts'

function fileName(path: string): string {
  return path.split('/').slice(-2).join('/')
}

function metricNumber(id: VariantId, key: string): number | null {
  const m = variants.find((v) => v.meta.variant === id)?.metrics[key]
  return m?.status === 'ok' && typeof m.value === 'number' ? m.value : null
}

/** Proportional bar row for one variant of the footprint. */
function FootprintRow({ id, max }: { id: VariantId; max: number }) {
  const c = VARIANT_COLOR[id]
  const source = metricNumber(id, 'change.footprint.sourceFiles')
  const docs = metricNumber(id, 'change.footprint.docs')
  const projects = metricNumber(id, 'change.footprint.projects')
  if (source == null) {
    return (
      <div className="xp-row">
        <span className="xp-name" style={{ color: c.glow }}>
          {VARIANT_LABEL[id]}
        </span>
        <span className="tiny muted">footprint pending for this variant</span>
      </div>
    )
  }
  return (
    <div className="xp-row">
      <span className="xp-name" style={{ color: c.glow }}>
        {VARIANT_LABEL[id]}
      </span>
      <div className="xp-track">
        <div className="xp-bar" style={{ width: `${(source / max) * 100}%`, background: c.mark }} />
      </div>
      <span className="xp-count mono">
        <b>{source}</b> source files
      </span>
      <span className="xp-breakdown tiny muted mono">
        + {docs} docs · across <b>{projects} projects</b>
      </span>
    </div>
  )
}

export function ChangeCost() {
  const ids = variants.map((v) => v.meta.variant as VariantId)
  const max = Math.max(1, ...ids.map((id) => metricNumber(id, 'change.footprint.sourceFiles') ?? 0))

  return (
    <>
      <Reveal className="card changecost">
        <div className="xp-head">
          <span className="contrast-title">One capability, three footprints</span>
          <span className="tiny muted">
            hand-written files where the risk-trend capability lives — counted by the collector, one spec for all three
          </span>
        </div>
        {ids.map((id) => (
          <FootprintRow key={id} id={id} max={max} />
        ))}
        <p className="chart-note">
          Same product intent, same acceptance criteria (derive from risk score, table column with a text badge, filter,
          detail view, tests — <code className="mono">docs/product/03-ai-task-protocol.md</code>). This is a{' '}
          <b>footprint</b> — where the capability is present today — not a historical diff: Overfit&rsquo;s implementation
          has no isolable baseline commit, so one deterministic method measures all three (cross-checked against the real
          diffs where they exist: ±2 files). Overfit&rsquo;s generated mirrors (OpenAPI, TS client) regenerate on top of its
          count; documentation is counted as a synchronization surface, not as a flaw.
        </p>
      </Reveal>

      <Reveal className="card changecost">
        <div className="xp-head">
          <span className="contrast-title">Why it spreads</span>
          <span className="tiny muted">hand-written copies of the shared contract each variant keeps in sync</span>
        </div>
        <div className="changecost-truth">
          <span className="changecost-chip truth mono" title="The shared contract — the one edit everyone starts with.">
            {SOURCE_OF_TRUTH}
          </span>
          <span className="tiny muted">the single source of truth — everyone edits this once. Then:</span>
        </div>
        {variants.map((v) => {
          const id = v.meta.variant as VariantId
          const c = VARIANT_COLOR[id]
          const m = v.metrics['change.contract.restatements']
          const files: string[] = m?.files ?? []
          const n = m?.status === 'ok' ? (m.value as number) : null
          return (
            <div className="changecost-row" key={id}>
              <div className="changecost-name">
                <span style={{ color: c.glow }}>{VARIANT_LABEL[id]}</span>
                <span className="changecost-count mono" style={{ color: n === 0 ? 'var(--good, #2fbf71)' : 'var(--ink)' }}>
                  {n == null ? 'pending' : n === 0 ? '+0 copies' : `+${n} ${n === 1 ? 'copy' : 'copies'}`}
                </span>
              </div>
              <div className="changecost-files">
                {n === 0 && <span className="tiny muted">imports the contract — nothing else to touch, nothing to drift.</span>}
                {files.map((f) => (
                  <span key={f} className="changecost-chip mono" style={{ borderColor: c.mark }} title={f}>
                    {fileName(f)}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </Reveal>
    </>
  )
}
