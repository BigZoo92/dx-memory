import { variants } from '../data'
import type { VariantId } from '../types'
import { VARIANT_COLOR } from '../lib/theme'
import { relativeTime } from '../lib/format'
import { summary } from '../data'
import { Reveal, ScoreMeter, Chip } from './ui'
import { scoreColor } from '../lib/theme'

const AX = ['Build', 'Ship', 'Run', 'Change'] as const

export function Hero() {
  const ranked = [...variants].sort(
    (a, b) => (b.scores.totalDeliveryScore.value ?? 0) - (a.scores.totalDeliveryScore.value ?? 0)
  )

  return (
    <header className="shell hero" id="overview">
      <Reveal>
        <div className="sec-kicker">SignalOps · Delivery-cost lab</div>
        <h1 className="hero-title">
          The best build isn’t the one that wins every metric. It’s the one that’s <span className="em">cheapest to keep delivering.</span>
        </h1>
        <p className="hero-lede">
          One product, three architectures. This dashboard scores <b>Flow</b>, <b>Friction</b> and <b>Overfit</b> on the four
          axes of delivery cost — Build, Ship, Run and Change — from metrics collected automatically off the real repository.
          No hand-typed numbers.
        </p>
        <div className="hero-meta">
          <Chip color={scoreColor(100)}>source: {summary.source}</Chip>
          <Chip>commit {summary.commitShort ?? '—'}</Chip>
          <Chip>branch {summary.branch ?? '—'}</Chip>
          <Chip>generated {relativeTime(summary.generatedAt)}</Chip>
          <Chip>
            {variants.reduce((s, v) => s + v.statuses.ok, 0)} live metrics ·{' '}
            {variants.reduce((s, v) => s + v.statuses.unavailable, 0)} pending
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
                  <span>{i === 0 ? 'best total delivery' : i === 2 ? 'highest total cost' : 'middle'}</span>
                </div>
                <div className="vcard-name">{v.meta.label}</div>
                <div className="vcard-stack">{v.meta.stack}</div>
                <div className="vcard-score">
                  <span className="n" style={{ color: c.glow }}>
                    {total?.toFixed(1) ?? '—'}
                  </span>
                  <span className="u">/ 100 delivery score</span>
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
