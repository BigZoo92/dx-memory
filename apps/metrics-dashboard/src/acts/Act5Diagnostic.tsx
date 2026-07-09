import { pack, VARIANT_NAME } from '../bench/data'
import type { VariantId } from '../bench/types'
import { fmtChrono } from '../bench/format'
import { seg, useStickyProgress, useWidth } from '../lib/hooks'
import { Act, Affirm, Kicker, Lecture } from '../ui/voice'

const CHAIN = [
  { label: 'CONTRAT', detail: 'tags : string[] — le type le promet' },
  { label: 'FRONTIÈRE', detail: 'la donnée traverse sans être vérifiée' },
  { label: 'tags = null', detail: 'la promesse est rompue au runtime' },
  { label: '.map()', detail: "l'opération qui faisait confiance" },
  { label: 'CRASH', detail: 'TypeError: Cannot read properties of null' }
]

function CausalChain() {
  const { ref, progress } = useStickyProgress<HTMLDivElement>()
  return (
    <div ref={ref} className="chain-scene">
      <div className="chain-sticky">
        <p className="chain-empty" style={{ opacity: 1 - seg(progress, 0, 0.14) * 0.9 }}>
          ÉCRAN VIDE
        </p>
        <ol className="chain">
          {CHAIN.map((link, i) => {
            const a = 0.08 + (i * 0.8) / CHAIN.length
            const p = seg(progress, a, a + 0.14)
            return (
              <li
                key={link.label}
                className={`chain-link${link.label === 'CRASH' ? ' is-crash' : ''}`}
                style={{ opacity: p, transform: `translateY(${(1 - p) * 26}px)` }}
              >
                <span className="chain-label">{link.label}</span>
                <span className="chain-detail">{link.detail}</span>
                {i < CHAIN.length - 1 && <span className="chain-arrow" aria-hidden="true">↓</span>}
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

const LANES: VariantId[] = ['flow', 'friction', 'overfit']

function HypothesisRace() {
  const { ref, width } = useWidth<HTMLDivElement>(860)
  const maxMs = 348000
  const P = { left: 108, right: 24, laneH: 74, top: 34 }
  const plotW = Math.max(320, width - P.left - P.right)
  const x = (ms: number) => P.left + (ms / maxMs) * plotW
  const height = P.top + LANES.length * P.laneH + 44
  const ticks = [0, 60000, 120000, 180000, 240000, 300000]
  return (
    <div ref={ref} className="race">
      <svg viewBox={`0 0 ${width} ${height}`} className="race-svg" role="img" aria-label="Course au diagnostic S03 : première hypothèse correcte puis cause confirmée, par variante">
        {ticks.map((t) => (
          <g key={t} transform={`translate(${x(t)}, 0)`}>
            <line y1={P.top - 12} y2={height - 34} className="race-grid" />
            <text y={height - 16} textAnchor="middle" className="race-tick">{fmtChrono(t)}</text>
          </g>
        ))}
        {LANES.map((v, i) => {
          const y = P.top + i * P.laneH + P.laneH / 2
          const h = pack.s03[v].timeToFirstHypothesisMs
          const rc = pack.s03[v].timeToRootCauseMs
          return (
            <g key={v} className={`race-lane v-${v}`}>
              <text x={P.left - 14} y={y + 4} textAnchor="end" className="race-name">{VARIANT_NAME[v]}</text>
              <line x1={P.left} x2={width - P.right} y1={y} y2={y} className="race-base" />
              <line x1={x(h)} x2={x(rc)} y1={y} y2={y} className="race-span" />
              <circle cx={x(h)} cy={y} r="7" className="race-hypo" />
              <circle cx={x(rc)} cy={y} r="7.5" className="race-confirm" />
              <text x={x(h)} y={y - 14} textAnchor="middle" className="race-time hypo-label">{fmtChrono(h)}</text>
              <text x={x(rc)} y={y + 26} textAnchor="middle" className="race-time">{fmtChrono(rc)}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function Act5Diagnostic() {
  return (
    <Act id="diagnostic" tone="dark">
      <Kicker>Scénario S03 · un ticket vague, un défaut injecté, trois enquêtes</Kicker>
      <CausalChain />
      <Affirm size="md">Qui comprend le premier ?</Affirm>
      <HypothesisRace />
      <Lecture>
        Flow ne confirme pas la cause en premier. Il construit le bon modèle en premier
      </Lecture>
    </Act>
  )
}
