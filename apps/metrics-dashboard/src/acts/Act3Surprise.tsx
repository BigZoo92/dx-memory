import { pack, VARIANT_NAME } from '../bench/data'
import type { VariantId } from '../bench/types'
import { fmtChrono } from '../bench/format'
import { useCountUp, useInView } from '../lib/hooks'
import { N } from '../lib/Prov'
import { Act, Affirm, Kicker, Reveal } from '../ui/voice'

const ORDER: VariantId[] = ['friction', 'flow', 'overfit']

function Chrono({ variant, started, rank }: { variant: VariantId; started: boolean; rank: number }) {
  const target = pack.s01[variant].timeToGreenMs
  const value = useCountUp(target, started, 2200 + rank * 500)
  const done = value >= target
  return (
    <div className={`chrono v-${variant}${done ? ' is-done' : ''}`}>
      <p className="chrono-name">{VARIANT_NAME[variant]}</p>
      <N
        info={{
          what: `Temps jusqu'au FULL_GREEN, scénario S01 (${VARIANT_NAME[variant]})`,
          level: 'direct',
          source: pack.s01[variant].source,
          note: 'Horodatage instrumenté, du prompt au dernier gate vert du chemin de validation de la variante.'
        }}
      >
        <span className="chrono-value">{fmtChrono(value)}</span>
      </N>
      <div className="chrono-bar" aria-hidden="true">
        <span style={{ transform: `scaleX(${value / pack.s01.overfit.timeToGreenMs})` }} />
      </div>
    </div>
  )
}

export function Act3Surprise() {
  const { ref, inView } = useInView<HTMLDivElement>(0.55)
  return (
    <Act id="surprise" style={{paddingBottom: '20px'}}>
      <Kicker>Scénario S01 · « ajoute un niveau de risque de bout en bout »</Kicker>
      <Affirm size="md">Premier ticket. Trois chronos.</Affirm>
      <div ref={ref} className="chrono-row">
        {ORDER.map((v, i) => (
          <Chrono key={v} variant={v} started={inView} rank={i} />
        ))}
      </div>
      <div className="surprise-verdict">
        <Affirm size="xl" align="center">Friction gagne.</Affirm>
        <Reveal delay={250}>
          <p className="surprise-sub">Mon hypothèse ne tenait pas encore.</p>
        </Reveal>
        </div>
    </Act>
  )
}
