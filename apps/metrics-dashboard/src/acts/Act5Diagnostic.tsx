import { pack, VARIANT_NAME } from '../bench/data'
import type { VariantId } from '../bench/types'
import { fmtChrono } from '../bench/format'
import { seg, useStickyProgress, useWidth } from '../lib/hooks'
import { N } from '../lib/Prov'
import { Act, Affirm, Kicker, Lecture, Reveal } from '../ui/voice'

const CHAIN = [
  { label: 'SIGNAL', detail: 'sig_00500 — un enregistrement parmi mille' },
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
      <p className="race-legend">
        <span className="race-legend-hypo" /> première hypothèse <em>ultérieurement confirmée exacte</em>{' '}
        <span className="level-tag level-reviewable">post-hoc</span>
        <span className="race-legend-confirm" /> cause racine confirmée{' '}
        <span className="level-tag level-direct">horodatée</span>
      </p>
    </div>
  )
}

export function Act5Diagnostic() {
  return (
    <Act id="diagnostic" tone="dark">
      <Kicker>Scénario S03 · un ticket vague, un défaut injecté, trois enquêtes</Kicker>
      <CausalChain />
      <Reveal>
        <p className="prose">
          Un injecteur de défaut neutre a rompu le contrat avant chaque run : <code>tags = null</code>{' '}
          au runtime, gates standards toujours vertes. Les trois agents ne reçoivent qu'un ticket
          vague. La vérité terrain reste cachée jusqu'à l'événement <code>ROOT_CAUSE_FOUND</code>.
        </p>
      </Reveal>
      <Affirm size="md">Qui comprend le premier ?</Affirm>
      <HypothesisRace />
      <div className="race-verdicts">
        <Reveal>
          <p className="race-fact">
            Friction confirme la première —{' '}
            <N info={{ what: 'Temps jusqu\'à la cause racine confirmée, S03 Friction', level: 'direct', source: pack.s03.friction.source }}>
              <strong>{fmtChrono(pack.s03.friction.timeToRootCauseMs)}</strong>
            </N>
            , 18 secondes devant Flow. Les trois enquêtes aboutissent : cause exacte, zéro fausse
            piste, 3 à 4 fichiers inspectés.
          </p>
        </Reveal>
        <Reveal delay={200}>
          <p className="race-fact">
            Mais Flow formule une hypothèse causalement correcte après{' '}
            <N
              info={{
                what: 'Temps jusqu\'à la première hypothèse, S03 Flow — correction vérifiée ensuite contre la vérité terrain',
                level: 'reviewable',
                source: pack.s03.flow.source,
                note: 'L\'horodatage est une mesure directe ; « correcte » est un classement post-hoc contre le ground truth.'
              }}
            >
              <strong>53 secondes</strong>
            </N>{' '}
            : « le rendu suppose que <code>tags</code> est toujours un tableau, et aucune frontière de
            données ne le garantit ».
          </p>
        </Reveal>
      </div>
      <Lecture>
        Flow ne confirme pas la cause en premier. Il construit le bon modèle en premier — la structure
        dit tôt où la promesse pouvait se rompre.
      </Lecture>
      <Reveal>
        <p className="method-link">
          Les temps de correction et tailles de patch de S03 ne sont pas classés — seams d'injection
          asymétriques et consigne perdue au re-scope. <a href="#limites">Pourquoi le temps de correction n'est pas classé →</a>
        </p>
      </Reveal>
    </Act>
  )
}
