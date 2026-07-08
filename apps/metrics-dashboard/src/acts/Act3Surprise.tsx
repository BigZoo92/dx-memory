import { pack, VARIANT_NAME } from '../bench/data'
import type { VariantId } from '../bench/types'
import { fmtChrono, fmtDuration } from '../bench/format'
import { useCountUp, useInView } from '../lib/hooks'
import { N } from '../lib/Prov'
import { Act, Affirm, Kicker, Lecture, Reveal } from '../ui/voice'

/** S01 au chrono, du plus rapide au plus lent — l'ordre est le message. */
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
    <Act id="surprise">
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
        <Reveal delay={400}>
          <p className="surprise-detail">
            Fichiers touchés :{' '}
            <N info={{ what: 'Fichiers modifiés S01, Friction', level: 'direct', source: pack.s01.friction.source }}>
              <strong>17</strong>
            </N>{' '}
            Friction ·{' '}
            <N info={{ what: 'Fichiers modifiés S01, Flow', level: 'direct', source: pack.s01.flow.source }}>
              <strong>17</strong>
            </N>{' '}
            Flow ·{' '}
            <N info={{ what: 'Fichiers modifiés S01, Overfit', level: 'direct', source: pack.s01.overfit.source }}>
              <strong>26</strong>
            </N>{' '}
            Overfit. Première modification après{' '}
            <N info={{ what: 'Temps jusqu\'à la première modification, S01 Friction', level: 'direct', source: pack.s01.friction.source }}>
              <strong>{fmtDuration(pack.s01.friction.timeToFirstChangeMs)}</strong>
            </N>{' '}
            chez Friction,{' '}
            <N info={{ what: 'Temps jusqu\'à la première modification, S01 Flow', level: 'direct', source: pack.s01.flow.source }}>
              <strong>{fmtDuration(pack.s01.flow.timeToFirstChangeMs)}</strong>
            </N>{' '}
            chez Flow.
          </p>
        </Reveal>
      </div>
      <Lecture>
        Le chemin direct absorbe le premier changement plus vite. Flow paie ici sa taxe d'entrée
        architecturale : huit minutes de lecture avant d'oser la première ligne.
      </Lecture>
    </Act>
  )
}
