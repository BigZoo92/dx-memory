import { variants, summary } from '../data'
import type { VariantId } from '../types'
import { VARIANT_COLOR, STATUS, scoreColor } from '../lib/theme'
import { relativeTime } from '../lib/format'
import { Reveal, ScoreMeter, Chip } from './ui'

const AX = ['Build', 'Ship', 'Run', 'Change'] as const

export function Hero() {
  const ranked = [...variants].sort(
    (a, b) => (b.scores.totalDeliveryScore.value ?? 0) - (a.scores.totalDeliveryScore.value ?? 0)
  )
  const live = variants.reduce((s, v) => s + v.statuses.ok, 0)
  const pending = variants.reduce((s, v) => s + v.statuses.unavailable, 0)
  // The verdict is FINAL only when measured by CI at the deployed SHA with every scored
  // member present (verify-summary gates that in the release pipeline). Anything else —
  // local collection, partial docker coverage — is a provisional snapshot and says so.
  const provisional = summary.provenance?.source !== 'ci' || pending > 0

  return (
    <header className="shell hero" id="verdict">
      <Reveal>
        <div className="sec-kicker">SignalOps · DX Lab</div>
        <h1 className="hero-title">
          One product. Three architectures. <span className="em">One is cheapest to keep delivering.</span>
        </h1>
        <p className="hero-lede">
          Same features, same dataset, same routes — only the engineering differs. Every number below is measured from the
          real repository and scored <b>ratio-to-best</b>: the cheapest variant sets the bar at 100.
        </p>
        <div className="hero-meta">
          {summary.provenance?.source === 'ci' ? (
            <Chip color={STATUS.good}>CI-measured · commit {summary.commitShort ?? '—'}</Chip>
          ) : (
            <Chip color={STATUS.warning}>provisional · local collection · {summary.commitShort ?? '—'}</Chip>
          )}
          <Chip>generated {relativeTime(summary.generatedAt)}</Chip>
          <Chip>
            {live} measured · {pending} pending
          </Chip>
        </div>
      </Reveal>

      <div className="podium">
        {ranked.map((v, i) => {
          const id = v.meta.variant as VariantId
          const c = VARIANT_COLOR[id]
          const total = v.scores.totalDeliveryScore.value
          return (
            <Reveal key={id} delay={i * 90}>
              <article
                className={`vcard ${i === 0 ? 'winner' : ''}`}
                style={{ ['--vcolor' as string]: c.mark, ['--vglow' as string]: c.glow }}
              >
                <div className="vcard-glow" />
                <div className="vcard-rank">
                  <span>#{i + 1} of 3</span>
                  <span>{i === 0 ? 'lowest delivery cost' : i === 2 ? 'highest delivery cost' : ''}</span>
                </div>
                <div className="vcard-name">{v.meta.label}</div>
                <div className="vcard-stack">{v.meta.stack}</div>
                <div className="vcard-score">
                  <span className="n" style={{ color: c.glow }}>
                    {total?.toFixed(1) ?? '—'}
                  </span>
                  <span className="u">/ 100 {provisional ? 'provisional score' : 'delivery score'}</span>
                </div>
                <div style={{ marginTop: 12 }}>
                  <ScoreMeter value={total} color={c.glow} />
                </div>
                <p className="vcard-thesis">{v.meta.thesis}</p>
                <div className="vcard-axes">
                  {AX.map((ax) => {
                    const s = v.scores[ax.toLowerCase()]
                    return (
                      <div className="axpill" key={ax}>
                        <div className="l">{ax}</div>
                        <div className="v" style={{ color: s?.value == null ? 'var(--ink-4)' : scoreColor(s.value) }}>
                          {s?.value == null ? '·' : s.value.toFixed(0)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </article>
            </Reveal>
          )
        })}
      </div>
    </header>
  )
}
