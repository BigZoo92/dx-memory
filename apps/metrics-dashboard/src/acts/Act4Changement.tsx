import { pack, VARIANT_NAME } from '../bench/data'
import type { VariantId } from '../bench/types'
import { fmtChrono, fmtInt } from '../bench/format'
import { useInView } from '../lib/hooks'
import { N } from '../lib/Prov'
import { Act, Affirm, Kicker, Lecture, Reveal } from '../ui/voice'
import { Gravity } from './Gravity'
import { Loom } from './Loom'

const BY_TIME: VariantId[] = ['friction', 'flow', 'overfit']
const BY_CHURN: VariantId[] = ['flow', 'friction', 'overfit']
const BY_TOUCHES: VariantId[] = ['friction', 'flow', 'overfit']

/** Temps cumulé S01+S02 : barres empilées, Friction reste devant — dit en premier. */
function CumulativeTime() {
  const { ref, inView } = useInView<HTMLDivElement>(0.4)
  const max = pack.cumulative.overfit.timeMs
  return (
    <div ref={ref} className={`cumtime${inView ? ' is-in' : ''}`}>
      {BY_TIME.map((v) => {
        const s1 = pack.s01[v].timeToGreenMs
        const s2 = pack.s02[v].timeToGreenMs
        const total = pack.cumulative[v].timeMs
        return (
          <div key={v} className={`cumtime-row v-${v}`}>
            <span className="cumtime-name">{VARIANT_NAME[v]}</span>
            <div className="cumtime-track">
              <span className="cumtime-seg seg-a" style={{ width: `${(s1 / max) * 100}%` }} />
              <span className="cumtime-seg seg-b" style={{ width: `${(s2 / max) * 100}%` }} />
            </div>
            <N
              info={{
                what: `Temps cumulé S01 + S02 jusqu'au vert (${VARIANT_NAME[v]})`,
                level: 'derived',
                source: `${pack.s01[v].source} + ${pack.s02[v].source}`,
                formula: 'S01.time_to_green_ms + S02.time_to_green_ms'
              }}
            >
              <span className="cumtime-value">{fmtChrono(total)}</span>
            </N>
          </div>
        )
      })}
      <p className="cumtime-legend">
        <span className="lg-a" /> S01 <span className="lg-b" /> S02 — temps cumulé jusqu'au vert
      </p>
    </div>
  )
}

/** Le churn comme matière : une marque de comptage par LOC (groupes de 5). */
function TallyStrip({ variant, value, what, source }: { variant: VariantId; value: number; what: string; source: string }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.25)
  const groups = Math.floor(value / 5)
  const rest = value % 5
  const PER_ROW = 24
  const rows = Math.ceil((groups + (rest ? 1 : 0)) / PER_ROW)
  const GW = 26
  const RH = 30
  const width = PER_ROW * GW + 8
  return (
    <div ref={ref} className={`tally v-${variant}${inView ? ' is-in' : ''}`}>
      <div className="tally-head">
        <span className="tally-name">{VARIANT_NAME[variant]}</span>
        <N info={{ what, level: 'derived', source, formula: 'Σ loc_added + loc_deleted' }}>
          <span className="tally-value">{fmtInt(value)}</span>
        </N>
      </div>
      <svg viewBox={`0 0 ${width} ${rows * RH}`} className="tally-svg" role="img" aria-label={`${what} : ${value} LOC`}>
        {Array.from({ length: groups + (rest ? 1 : 0) }, (_u, gi) => {
          const strokes = gi < groups ? 5 : rest
          const x = (gi % PER_ROW) * GW + 4
          const y = Math.floor(gi / PER_ROW) * RH + 5
          return (
            <g key={gi} transform={`translate(${x}, ${y})`} className="tally-group" style={{ transitionDelay: `${Math.min(gi * 6, 900)}ms` }}>
              {Array.from({ length: Math.min(strokes, 4) }, (_, si) => (
                <line key={si} x1={si * 5} y1={2} x2={si * 5} y2={18} />
              ))}
              {strokes === 5 && <line x1={-2.5} y1={16} x2={17.5} y2={4} />}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/** File-touches : une cellule par fichier touché. */
function TouchGrid() {
  const { ref, inView } = useInView<HTMLDivElement>(0.3)
  return (
    <div ref={ref} className={`touchgrid${inView ? ' is-in' : ''}`}>
      {BY_TOUCHES.map((v) => (
        <div key={v} className={`touchgrid-row v-${v}`}>
          <span className="touchgrid-name">{VARIANT_NAME[v]}</span>
          <div className="touchgrid-cells">
            {Array.from({ length: pack.cumulative[v].fileTouches }, (_, i) => (
              <span key={i} className="touch-cell" style={{ transitionDelay: `${i * 22}ms` }} />
            ))}
          </div>
          <N
            info={{
              what: `Fichiers touchés cumulés S01 + S02 (${VARIANT_NAME[v]})`,
              level: 'derived',
              source: `${pack.s01[v].source} + ${pack.s02[v].source}`,
              formula: 'S01 changed files + S02 changed files'
            }}
          >
            <span className="touchgrid-value">{pack.cumulative[v].fileTouches}</span>
          </N>
        </div>
      ))}
    </div>
  )
}

export function Act4Changement() {
  return (
    <Act id="changement">
      <Kicker>Scénario S02 · le métier change d'avis</Kicker>
      <div className="critical-entrance" aria-hidden="true">
        <span className="critical-chip">critical</span>
      </div>
      <Affirm size="lg">
        Le métier revient : un niveau
        <br />
        de plus, au-dessus de « high ».
      </Affirm>
      <Reveal>
        <p className="prose">
          S02 part du résultat validé de S01 de chaque variante.
        </p>
      </Reveal>
      <CumulativeTime />
      <Reveal>
        <p className="prose">
          Friction reste la plus rapide sur ces deux petits changements proches. Regardons la <strong>matière</strong> déplacée pour
          livrer la même évolution :
        </p>
      </Reveal>
      <div className="tally-block">
        {BY_CHURN.map((v) => (
          <TallyStrip
            key={v}
            variant={v}
            value={pack.cumulative[v].churn}
            what={`Churn LOC cumulé S01 + S02 (${VARIANT_NAME[v]})`}
            source={`${pack.s01[v].source} + ${pack.s02[v].source}`}
          />
        ))}
      </div>
      <Reveal>
        <p className="prose">
          Et le nombre de fichiers lus par l'agent
        </p>
      </Reveal>
      <TouchGrid />
      <Lecture>
        Rapide aujourd'hui ne veut pas dire économique demain. 41 fichiers traversés pour Overfit là où le même besoin en touche 27
        ou 28.
      </Lecture>
      <Affirm size="md">Où vit la connaissance métier ?</Affirm>
      <Loom />
      <Gravity />
    </Act>
  )
}
