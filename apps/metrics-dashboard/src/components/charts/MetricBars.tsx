import { summary, variants } from '../../data'
import type { VariantId } from '../../types'
import { VARIANT_COLOR, VARIANT_LABEL } from '../../lib/theme'
import { metricText, directionLabel, directionArrow } from '../../lib/format'
import { useTip } from '../ui'

/**
 * One metric, three variants. Bar length encodes the NORMALIZED score (longer = better,
 * direction-aware), the label shows the REAL value, and the winner is marked. Metrics that
 * weren't measured render an explicit hatched "pending" bar — never a fake zero.
 */
export function MetricBar({ metricKey }: { metricKey: string }) {
  const { show, hide } = useTip()
  const cat = summary.catalog[metricKey]
  const norm = summary.normScores[metricKey] ?? {}
  const winner = summary.winners[metricKey]

  return (
    <div style={{ marginBottom: 16 }}>
      <div className="between" style={{ marginBottom: 8 }}>
        <span className="tiny" style={{ color: 'var(--ink)' }}>
          {cat?.label ?? metricKey}
        </span>
        <span className="tiny muted mono" title={directionLabel(cat?.direction ?? 'neutral')}>
          {directionArrow(cat?.direction ?? 'neutral')} {directionLabel(cat?.direction ?? 'neutral')}
        </span>
      </div>
      {variants.map((v) => {
        const id = v.meta.variant as VariantId
        const m = v.metrics[metricKey]
        const ns = norm[id]
        const pending = !m || m.status !== 'ok' || ns == null
        const c = VARIANT_COLOR[id]
        return (
          <div key={id} className="row" style={{ marginBottom: 6, gap: 12 }}>
            <span className="tiny mono" style={{ width: 58, color: 'var(--ink-2)' }}>
              {VARIANT_LABEL[id]}
            </span>
            <div
              style={{ flex: 1, height: 22, position: 'relative', cursor: 'default' }}
              onMouseMove={(e) =>
                show(
                  <div>
                    <div className="tt-title">
                      {VARIANT_LABEL[id]} · {cat?.label}
                    </div>
                    <div className="tt-row">
                      <span>value</span>
                      <span className="v">{metricText(m)}</span>
                    </div>
                    <div className="tt-row">
                      <span>normalized</span>
                      <span className="v">{pending ? 'pending' : `${ns!.toFixed(0)} / 100`}</span>
                    </div>
                    {winner && (
                      <div className="tt-row">
                        <span>best</span>
                        <span className="v">{VARIANT_LABEL[winner]}</span>
                      </div>
                    )}
                  </div>,
                  e
                )
              }
              onMouseLeave={hide}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 6,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--hair)'
                }}
              />
              {pending ? (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 6,
                    backgroundImage:
                      'repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0 6px, transparent 6px 12px)',
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: 10,
                    fontSize: 11,
                    color: 'var(--ink-3)',
                    fontStyle: 'italic'
                  }}
                >
                  pending — {m?.reason ? shortReason(m.reason) : 'not measured'}
                </div>
              ) : (
                <div
                  style={{
                    position: 'absolute',
                    top: 3,
                    bottom: 3,
                    left: 3,
                    width: `calc(${Math.max(2, ns!)}% - 6px)`,
                    minWidth: 4,
                    borderRadius: 4,
                    background: winner === id ? c.glow : c.mark,
                    boxShadow: winner === id ? `0 0 14px ${c.soft}` : 'none',
                    transition: 'width 0.8s cubic-bezier(0.2,0.7,0.2,1)'
                  }}
                />
              )}
              <span
                className="mono"
                style={{
                  position: 'absolute',
                  right: 9,
                  top: 3,
                  fontSize: 12,
                  color: 'var(--ink)',
                  lineHeight: '16px'
                }}
              >
                {metricText(m)}
                {winner === id && !pending && <span className="win-badge" />}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function shortReason(r: string): string {
  return r.length > 42 ? `${r.slice(0, 42)}…` : r
}

export function MetricBarGroup({ metricKeys }: { metricKeys: string[] }) {
  return (
    <>
      {metricKeys.map((k) => (
        <MetricBar key={k} metricKey={k} />
      ))}
    </>
  )
}
